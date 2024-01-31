const express= require('express');
const morgan = require('morgan');
const docx = require("docx");
const fs= require('fs');
const mammoth = require("mammoth");
const multer = require('multer');

const app= express();
const PORT=3000;

// Настройка multer для сохранения загружаемых файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Убедитесь, что этот каталог существует
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '.docx')
    }
});
const upload = multer({ storage: storage });

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))

async function extractPlaceholders(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value; // The raw text
        const messages = result.messages;

        // Использование регулярного выражения для поиска конструкций вида {{name}}
        const regex = /{{(.*?)}}/g;
        let match;
        const placeholders = [];

        while ((match = regex.exec(text)) !== null) {
            placeholders.push(match[1]);
        }
        return placeholders;
    } catch (err) {
        console.log(err);
    }
}
// Маршрут /patch
app.post('/patch', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    if (!req.body.patches) {
        return res.status(400).send('No patches data uploaded');
    }

    const filePath = req.file.path;
    const patches = JSON.parse(req.body.patches);

    const patchData = {};
    for (const [key, value] of Object.entries(patches)) {
        patchData[key] = {
            type: docx.PatchType.PARAGRAPH,
            children: [new docx.TextRun(value)]
        };
    }

    docx.patchDocument(fs.readFileSync(filePath), {
        outputType: "nodebuffer",
        patches: patchData
    }).then(doc => {
        const patchedFilePath = 'uploads/patched-' + Date.now() + '.docx';
        fs.writeFileSync(patchedFilePath, doc);

        // Отправляем обработанный файл обратно на фронтенд
        res.download(patchedFilePath, () => {
            // Удаляем исходный и обработанный файлы после отправки
                fs.unlink(filePath, err => {
                    if (err) console.error('Error deleting original file:', err);
                });
                fs.unlink(patchedFilePath, err => {
                    if (err) console.error('Error deleting patched file:', err);
                });
        });
    }).catch(err => {
        console.error(err);
        res.status(500).send('Error processing the file');

        // Удаляем исходный файл в случае ошибки
        fs.unlink(filePath, err => {
            if (err) console.error('Error deleting original file:', err);
        });
    });
});

// Маршрут для загрузки файла
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const filePath = req.file.path;

    extractPlaceholders(filePath)
        .then(placeholders => {
            console.log(placeholders);
            res.json(placeholders); // Отправляем данные обратно на фронтенд
            fs.unlink(filePath, err => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error processing the file');
            fs.unlink(filePath, err => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
        });
});

app.listen(PORT,(error)=>{
    error ? console.log(error) : console.log(`listetning server on ${PORT}`);
});

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))