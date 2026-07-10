const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function run() {
  fs.writeFileSync('f1.txt', '1');
  fs.writeFileSync('f2.txt', '2');
  fs.writeFileSync('f3.txt', '3');
  
  const form = new FormData();
  form.append('files', fs.createReadStream('f1.txt'));
  form.append('files', fs.createReadStream('f2.txt'));
  form.append('files', fs.createReadStream('f3.txt'));

  const res = await fetch('http://localhost:3000/api/test-upload', {
    method: 'POST',
    body: form
  });
  console.log(await res.json());
}
run();
