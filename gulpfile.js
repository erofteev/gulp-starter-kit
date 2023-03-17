// ОСНОВНОЙ МОДУЛЬ
import gulp from 'gulp';

// Плагины
import {deleteAsync as del} from 'del';
import fileInclude from 'gulp-file-include';
import replace from 'gulp-replace';
import typograf from 'gulp-typograf';
import webpHtmlNosvg from 'gulp-webp-html-nosvg';
import versionNumber from 'gulp-version-number';
import plumber from 'gulp-plumber';
import notify from 'gulp-notify';
import browsersync from 'browser-sync';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import rename from 'gulp-rename';
import cleanCss from 'gulp-clean-css';
import webpcss from 'gulp-webpcss';
import autoprefixer from 'gulp-autoprefixer';
import groupCssMediaQueries from 'gulp-group-css-media-queries';
import webpack from 'webpack-stream';
import webp from 'gulp-webp';
import imagemin from 'gulp-imagemin';
import newer from 'gulp-newer';
import fs from 'fs';
import fonter from 'gulp-fonter';
import ttf2woff2 from 'gulp-ttf2woff2';
import svgSprite from 'gulp-svg-sprite';
import svgmin from 'gulp-svgmin';
import ifPlugin from 'gulp-if';
import zipPlugin from 'gulp-zip';
import vinylFTP from 'vinyl-ftp';
import util from 'gulp-util';

import { configFTP } from './ftpconfig.js';
const sass = gulpSass(dartSass)
const ifMode = {
  isBuild: process.argv.includes('--build'),
  isDev: !process.argv.includes('--build')
}

//--------------------------------------- [Настройка путей]
// Получаем имя папки проекта
import * as nodePath from 'path';
const rootPath = nodePath.basename(nodePath.resolve());

// Пути
const distPath = `./dist`,
      srcPath = `./src`,
      path = {
        build: {
          html: `${distPath}/`,
          files: `${distPath}/assets/`,
          css: `${distPath}/assets/css/`,
          js: `${distPath}/assets/js/`,
          img: `${distPath}/assets/img/`,
          fonts: `${distPath}/assets/fonts/`,
        },
        src: {
          html: `${srcPath}/*.html`,
          files: `${srcPath}/assets/**/*.*`,
          scss: `${srcPath}/assets/scss/main.scss`,
          js: `${srcPath}/assets/js/main.js`,
          img: `${srcPath}/assets/img/**/*.{jpg,jpeg,png,gif,webp}`,
          svg: `${srcPath}/assets/img/**/*.svg`,
          svgicons: `${srcPath}/assets/img/svgicons/*.svg`,
        },
        watch: {
          html: `${srcPath}/**/*.html`,
          files: `${srcPath}/assets/**/*.*`,
          scss: `${srcPath}/assets/scss/**/*.scss`,
          js: `${srcPath}/assets/js/**/*.js`,
          img: `${srcPath}/assets/img/**/*.{jpg,jpeg,png,svg,gif,ico,webp}`,
        },
        clean: distPath,
        distPath: distPath,
        srcPath: srcPath,
        rootPath: rootPath,
        ftp: ``
      }

//--------------------------------------- [Настройка тасков]
// Очистка
const clear = async () => {
  return await del(path.clean)
}

// Копирование
// const copy = () => {
//   return gulp.src(path.src.files)
//   .pipe(gulp.dest(path.build.files))
// }

// HTML
const html = () => {
  return gulp.src(path.src.html)
    .pipe(plumber(
      notify.onError({
        title: 'HTML',
        message: 'Error: <%= error.message %>'
      })
    ))
    .pipe(fileInclude())
    .pipe(replace(/@img\//g, './assets/img/'))
    .pipe(typograf({
      locale: ['ru', 'en-US']
    }))
    .pipe(ifPlugin(ifMode.isBuild, webpHtmlNosvg()))
    .pipe(ifPlugin(ifMode.isBuild, versionNumber({
      'value': '%DT%',
      'append': {
        'key': '_v',
        'cover': 0,
        'to': [
          'css',
          'js',
        ]
      },
      'output': {
        'file': 'version.json'
      }
    })))
    .pipe(gulp.dest(path.build.html))
    .pipe(browsersync.stream())
}

// SCSS
const scss = () => {
  return gulp.src(path.src.scss, { sourcemaps: ifMode.isDev })
    .pipe(plumber(
      notify.onError({
        title: 'SCSS',
        message: 'Error: <%= error.message %>'
      })
    ))
    .pipe(replace(/@img\//g, '../img/'))
    .pipe(sass({
      outputStyle: 'expanded'
    }))
    .pipe(ifPlugin(ifMode.isBuild, groupCssMediaQueries()))
    .pipe(ifPlugin(ifMode.isBuild, webpcss({
      webpClass: '.webp',
      noWebpClass: '.no-webp'
    })))
    .pipe(ifPlugin(ifMode.isBuild, autoprefixer({
      grid: true,
      overrideBrowserslist: ['last 5 versions'],
      cascade: true
    })))
    .pipe(gulp.dest(path.build.css))
    .pipe(ifPlugin(ifMode.isBuild, cleanCss()))
    .pipe(rename({
      extname: '.min.css'
    }))
    .pipe(gulp.dest(path.build.css))
    .pipe(browsersync.stream())
}

// JS
const js = () => {
  return gulp.src(path.src.js, { sourcemaps: ifMode.isDev })
    .pipe(plumber(
      notify.onError({
        title: 'JS',
        message: 'Error: <%= error.message %>'
      })
    ))
      .pipe(webpack({
        mode: ifMode.isBuild ? 'production' : 'development',
        output: {
          filename: 'main.min.js',
        },
        module: {
          rules: [{
            test: /\.m?js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                    targets: "defaults"
                  }]
                ]
              }
            }
          }]
        },
        devtool: false
      }))
    .pipe(gulp.dest(path.build.js))
    .pipe(browsersync.stream())
}

// IMAGES
const img = () => {
  return gulp.src(path.src.img)
    .pipe(plumber(
      notify.onError({
        title: 'IMAGES',
        message: 'Error: <%= error.message %>'
      })
    ))
    .pipe(newer(path.build.img))
    .pipe(ifPlugin(ifMode.isBuild, webp()))
    .pipe(ifPlugin(ifMode.isBuild, gulp.dest(path.build.img)))
    .pipe(ifPlugin(ifMode.isBuild, gulp.src(path.src.img)))
    .pipe(ifPlugin(ifMode.isBuild, newer(path.build.img)))
    .pipe(ifPlugin(ifMode.isBuild, imagemin({
      progressive: true,
      svgoPlugins: [{ removeViewBox: false }],
      interlaced: true,
      optimizationLevel: 3 // 0 to 7
    })))
    .pipe(gulp.dest(path.build.img))
    .pipe(gulp.src(path.src.svg))
    .pipe(gulp.dest(path.build.img))
    .pipe(browsersync.stream())
}

// FONTS
const otfToTtf = () => {
  // ищем файлы шрифтов .otf
  return gulp.src(`${srcPath}/assets/fonts/*.otf`, {})
    .pipe(plumber(
      notify.onError({
        title: 'FONTS',
        message: 'Error: <%= error.message %>'
      })
    ))
    // конвертация в .ttf
    .pipe(fonter({
      formats: ['ttf']
    }))
    // выгрузка в исходную папку
    .pipe(gulp.dest(`${srcPath}/assets/fonts/`))
}

const ttfToWoff = () => {
  // ищем файлы шрифтов .ttf
  return gulp.src(`${srcPath}/assets/fonts/*.ttf`, {})
    .pipe(plumber(
      notify.onError({
        title: 'FONTS',
        message: 'Error: <%= error.message %>'
      })
    ))
    // конвертация в .ttf
    .pipe(fonter({
      formats: ['woff']
    }))
    // выгрузка в исходную папку
    .pipe(gulp.dest(`${path.build.fonts}`))
    .pipe(gulp.src(`${srcPath}/assets/fonts/*.ttf`))
    .pipe(ttf2woff2())
    .pipe(gulp.dest(`${path.build.fonts}`))
}

const fontsStyle = () => {
  //Файл стилей подключения шрифтов
  let fontsFile = `${srcPath}/assets/scss/fonts.scss`;
  //Проверяем, существуют ли файлы шрифтов
  fs.readdir(path.build.fonts, function(err, fontsFiles){
      if(fontsFiles) {
          //Проверяем, существует ли файл стилей для подключения шрифтов
          if(!fs.existsSync(fontsFile)) {
              //Если файла нет, создаём его
              fs.writeFile(fontsFile, '', cb);
              let newFileOnly;
              for (var i = 0; i < fontsFiles.length; i++) {
                  //Записываем подключения шрифтов в файл стилей
                  let fontFileName = fontsFiles[i].split('.')[0];
                  if (newFileOnly !== fontFileName) {
                      let fontName = fontFileName.split('-')[0] ? fontFileName.split('-')[0] : fontFileName;
                      let fontWeight = fontFileName.split('-')[1] ? fontFileName.split('-')[1] : fontFileName;
                      if (fontWeight.toLowerCase() === 'thin') {
                          fontWeight = 100;
                      } else if (fontWeight.toLowerCase() === 'extralight') {
                          fontWeight = 200;
                      } else if (fontWeight.toLowerCase() === 'light') {
                          fontWeight = 300;
                      } else if (fontWeight.toLowerCase() === 'medium') {
                          fontWeight = 500;
                      } else if (fontWeight.toLowerCase() === 'semibold') {
                          fontWeight = 600;
                      } else if (fontWeight.toLowerCase() === 'bold') {
                          fontWeight = 700;
                      } else if (fontWeight.toLowerCase() === 'extrabold' || fontWeight.toLowerCase() === 'heavy') {
                          fontWeight = 800;
                      } else if (fontWeight.toLowerCase() === 'black') {
                          fontWeight = 900;
                      } else {
                          fontWeight = 400;
                      }
                      fs.appendFile(fontsFile, `@font-face{\n\tfont-family: ${fontName};\n\tfont-display: swap;\n\tsrc: url("../fonts/${fontFileName}.woff2") format("woff2"), url("../fonts/${fontFileName}.woff") format("woff");\n\tfont-weight: ${fontWeight};\n\tfont-style: normal;\n}\r\n`, cb);
                      newFileOnly = fontFileName;
                  }
              }
          } else {
              //Если файл есть, выводим сообщение
              console.log("Файл scss/fonts.scss уже существует. Для обновления файла нужно его удалить!");
          }
      }
  });
  return gulp.src(`${srcPath}/assets/`);
  function cb() { }
}

// SVG Sprites
const svgSprites = () => {
  return gulp.src(`${path.src.svgicons}`, {})
    .pipe(plumber(
      notify.onError({
        title: 'SVG',
        message: 'Error: <%= error.message %>'
      })
    ))
    .pipe(svgmin({
      js2svg: {
        pretty: true,
      },
    }))
    .pipe(svgSprite({
      mode: {
        stack: {
          sprite: `../icons/icons.svg`,
          example: true
        }
      },
    }))
    .pipe(gulp.dest(`${path.build.img}`))
}

// ZIP
const zip = () => {
  del(`./${path.rootPath}.zip`)
  return gulp.src(`${path.distPath}/**/*.*`, {})
    .pipe(plumber(
      notify.onError({
        title: 'ZIP',
        message: 'Error: <%= error.message %>'
      })
    ))
    .pipe(zipPlugin(`${path.rootPath}.zip`))
    .pipe(gulp.dest('./'))
}

// FTP
const ftp = () => {
  configFTP.log = util.log;
  const ftpConnect = vinylFTP.create(configFTP);
  return gulp.src(`${path.distPath}/**/*.*`, {})
  .pipe(plumber(
    notify.onError({
      title: 'FTP',
      message: 'Error: <%= error.message %>'
    })
  ))
  .pipe(ftpConnect.dest(`/${path.ftp}/${path.rootPath}`))
}

// BrowserSync
const server = (done) => {
  browsersync.init({
    server: {
      baseDir: `${path.build.html}`
    },
    notify: false,
    port: 3000,
  })
}

//--------------------------------------- [Наблюдение за тасками]
// Наблюдатель за изменениями в файлах
function watcher() {
  // gulp.watch(path.watch.files, copy);
  gulp.watch(path.watch.html, html);
  gulp.watch(path.watch.scss, scss);
  gulp.watch(path.watch.js, js);
  gulp.watch(path.watch.img, img);
}

//--------------------------------------- [Выполнение тасков]
// Объединение функций по шрифтам
export { svgSprites }
const fonts = gulp.series(otfToTtf, ttfToWoff, fontsStyle)

// Основные задачи
const mainTasks = gulp.series(fonts, gulp.parallel( html, scss, js, img))

// Построение сценариев выполнения задач
const dev = gulp.series(clear, mainTasks, gulp.parallel(watcher, server));
const build = gulp.series(clear, mainTasks);
const deployZIP = gulp.series(clear, mainTasks, zip);
const deployFTP = gulp.series(clear, mainTasks, ftp);

// Экспорт сценариев
export { dev }
export { build }
export { deployZIP }
export { deployFTP }

// Выполнение сценария по-умолчанию
gulp.task('default', dev);