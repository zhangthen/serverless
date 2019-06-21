'use strict';

const fs = require('fs');
const path = require('path');
const globby = require('globby');
const archiver = require('archiver');
const BbPromise = require('bluebird');

function createZipFile(srcDirPath, outputFilePath) {
  const files = globby
    .sync(['**'], {
      cwd: srcDirPath,
      dot: true,
      silent: true,
    })
    .map(file => ({
      input: path.join(srcDirPath, file),
      output: file,
    }));

  return new BbPromise((resolve, reject) => {
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    output.on('open', () => {
      archive.pipe(output);

      files.forEach(file => {
        // TODO: update since this is REALLY slow
        if (fs.lstatSync(file.input).isFile()) {
          archive.append(fs.createReadStream(file.input), { name: file.output });
        }
      });

      archive.finalize();
    });

    archive.on('error', err => reject(err));
    output.on('close', () => resolve(outputFilePath));
  });
}

module.exports = createZipFile;
