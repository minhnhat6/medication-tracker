const fs = require('fs');
fs.writeFileSync('test1.txt', '1');
fs.writeFileSync('test2.txt', '2');

const FormData = require('form-data');
const fetch = require('node-fetch');

async function run() {
  const form = new FormData();
  form.append('files', fs.createReadStream('test1.txt'));
  form.append('files', fs.createReadStream('test2.txt'));
  form.append('title', 'Test Multi');

  const res = await fetch('http://localhost:3000/api/documents', {
    method: 'POST',
    body: form
  });
  console.log(await res.json());
}
run();
