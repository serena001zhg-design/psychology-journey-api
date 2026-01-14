const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// 连接 MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => console.error('MongoDB 连接失败:', err));

// 文件夹模型
const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Folder = mongoose.model('Folder', folderSchema);

// 笔记模型
const noteSchema = new mongoose.Schema({
  title: { type: String, default: '无标题' },
  content: { type: String, default: '' },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Note = mongoose.model('Note', noteSchema);

// API 路由

// 获取所有文件夹（带笔记数量）
app.get('/api/folders', async (req, res) => {
  try {
    const folders = await Folder.find().sort({ createdAt: -1 });
    const foldersWithCount = await Promise.all(
      folders.map(async (folder) => {
        const noteCount = await Note.countDocuments({ folderId: folder._id });
        return {
          _id: folder._id,
          name: folder.name,
          createdAt: folder.createdAt,
          noteCount
        };
      })
    );
    res.json(foldersWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建文件夹
app.post('/api/folders', async (req, res) => {
  try {
    const folder = new Folder({ name: req.body.name });
    await folder.save();
    res.status(201).json({ ...folder.toObject(), noteCount: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取文件夹下的笔记
app.get('/api/folders/:folderId/notes', async (req, res) => {
  try {
    const notes = await Note.find({ folderId: req.params.folderId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建笔记
app.post('/api/notes', async (req, res) => {
  try {
    const note = new Note({
      title: req.body.title,
      content: req.body.content,
      folderId: req.body.folderId
    });
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新笔记
app.put('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        content: req.body.content,
        updatedAt: Date.now()
      },
      { new: true }
    );
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除笔记
app.delete('/api/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});