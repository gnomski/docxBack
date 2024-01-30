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

function extractPlaceholders(filePath) {
    mammoth.extractRawText({path: filePath})
        .then(result => {
            const text = result.value; // The raw text
            const messages = result.messages;
            
            // Использование регулярного выражения для поиска конструкций вида {{name}}
            const regex = /{{(.*?)}}/g;
            let match;
            const placeholders = [];

            while ((match = regex.exec(text)) !== null) {
                placeholders.push({ [match[1]]: "" });
            }

            console.log(placeholders);
        })
        .catch(err => {
            console.log(err);
        });
}

const filePath = 'template.docx';
extractPlaceholders(filePath);

// Маршрут для загрузки файла
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const filePath = req.file.path;
    extractPlaceholders(filePath);

    res.send('File uploaded and processing started');
});

app.listen(PORT,(error)=>{
    error ? console.log(error) : console.log(`listetning server on ${PORT}`);
});

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))