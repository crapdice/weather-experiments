const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/chicago_weather_v86.csv');
const stream = fs.createReadStream(filePath, { encoding: 'utf8', start: 0, end: 1000 });

stream.on('data', (chunk) => {
    const firstLine = chunk.split('\n')[0];
    console.log(firstLine);
    stream.destroy();
});
