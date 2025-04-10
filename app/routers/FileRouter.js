const express = require('express');
const router = express.Router();
const FileController = require('../controllers/FileController');
const {auth, authAdmin, authToken} = require('../common/middleware/auth');
const {upload} = require("../common/utilFunctions");
const { withFileOr404, withFilters } = require('../common/middleware/fileMiddlewares');

router.post('/files', auth, async (req, res) => {
    return FileController.createFile(req, res);
});
router.post('/upload', auth, upload.single("file"), async (req, res) => {
    return FileController.uploadFile(req, res);
});
router.get('/files/count', auth, async (req, res) => {
  return FileController.count(req, res);
})
router.get('/files/:id', auth, withFileOr404, async (req, res) => {
    return FileController.getFile(req, res);
});
router.get('/datasets', auth, async (req, res) => {
    return FileController.getDatasets(req, res);
});
router.get('/datasets/:id', auth, async (req, res) => {
    return FileController.getDataset(req, res);
});
router.get('/files', auth, withFilters, async (req, res) => {
    return FileController.getFiles(req, res);
});
router.post('/reset_files', authAdmin, async (req, res) => {
    return FileController.bulkResetFiles(req, res);
});
router.put('/files/:id', auth, async (req, res) => {
    return FileController.updateFile(req, res);
});
router.put('/confirm/:id', auth, async (req, res) => {
    return FileController.confirmFile(req, res);
});
router.put('/remote/gpt/confirm/:id', authToken, async (req, res) => {
    return FileController.confirmFile(req, res);
});
router.get('/files/:id/result', auth, async (req, res) => {
    return FileController.exportFile(req, res);
});
router.delete('/files/:id', auth, async (req, res) => {
    return FileController.deleteFile(req, res);
});
router.delete('/files/:id/row/:row_id', auth, async (req, res) => {
    return FileController.deleteRow(req, res);
});
router.put('/files/:id/row/:row_id', auth, async (req, res) => {
    return FileController.editRow(req, res);
});
router.post('/files/:id/row/', auth, async (req, res) => {
    return FileController.addRow(req, res);
});
router.get('/bridge', auth, async (req, res) => {
    return FileController.bridgeRequest(req, res);
});

module.exports = router;
