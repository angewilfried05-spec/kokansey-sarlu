const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const markdownFile = path.join(__dirname, 'TUTORIEL_UTILISATION.md');
const pdfFile = path.join(__dirname, 'TUTORIEL_UTILISATION.pdf');

console.log('Conversion du tutoriel Markdown en PDF...');

// Utiliser pandoc si disponible, sinon utiliser markdown-pdf
const checkPandoc = () => {
  return new Promise((resolve) => {
    exec('pandoc --version', (error) => {
      resolve(!error);
    });
  });
};

const convertWithPandoc = () => {
  return new Promise((resolve, reject) => {
    const command = `pandoc "${markdownFile}" -o "${pdfFile}" --pdf-engine=xelatex -V geometry:margin=1in -V fontsize=12pt`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const convertWithMarkdownPdf = () => {
  return new Promise((resolve, reject) => {
    const MarkdownPDF = require('markdown-pdf');
    const options = {
      cssPath: path.join(__dirname, 'pdf-style.css'),
      remarkable: {
        html: true,
        breaks: true
      }
    };
    
    MarkdownPDF(options)
      .from(markdownFile)
      .to(pdfFile, () => {
        if (fs.existsSync(pdfFile)) {
          resolve();
        } else {
          reject(new Error('Échec de la conversion'));
        }
      });
  });
};

const main = async () => {
  try {
    const hasPandoc = await checkPandoc();
    
    if (hasPandoc) {
      console.log('Pandoc détecté, conversion avec Pandoc...');
      await convertWithPandoc();
    } else {
      console.log('Pandoc non détecté, installation de markdown-pdf...');
      exec('npm install markdown-pdf', (error) => {
        if (error) {
          console.error('Erreur lors de l\'installation de markdown-pdf:', error);
          process.exit(1);
        }
        console.log('Conversion avec markdown-pdf...');
        convertWithMarkdownPdf()
          .then(() => console.log('Conversion terminée avec succès!'))
          .catch(err => console.error('Erreur:', err));
      });
      return;
    }
    
    console.log('Conversion terminée avec succès!');
    console.log(`Fichier PDF créé: ${pdfFile}`);
  } catch (error) {
    console.error('Erreur lors de la conversion:', error);
    process.exit(1);
  }
};

main();
