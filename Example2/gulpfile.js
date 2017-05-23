/* = Gulp组件
 -------------------------------------------------------------- */
// 引入gulp
var gulp			= require('gulp');					// 基础库

// 引入我们的gulp组件
var sass 			= require('gulp-sass'),			// CSS预处理/Sass编译
    uglify 			= require('gulp-uglify'),				// JS文件压缩
    imagemin 		= require('gulp-imagemin'),		// imagemin 图片压缩
    pngquant 		= require('imagemin-pngquant'),	// imagemin 深度压缩
    livereload 		= require('gulp-livereload'),			// 网页自动刷新（服务器控制客户端同步刷新）
    webserver 		= require('gulp-webserver'),		// 本地服务器
    rename 		    = require('gulp-rename'),			// 文件重命名
    sourcemaps   	= require('gulp-sourcemaps'),		// 来源地图
    changed 		= require('gulp-changed'),			// 只操作有过修改的文件
    concat 			= require("gulp-concat"), 			// 文件合并
    del 			= require('del'),			// 文件清理
    inject          = require('gulp-inject'),          //html文件自动注入js、css
    hash            = require('gulp-hash'),//给文件名增加hash值，防止提交代码服务器缓存不更新
    revCollector    = require('gulp-rev-collector'), //替换htmljs、css文件
    //gulpif          = require('gulp-if'), //判断执行
    runSequence     = require('run-sequence'); // 按顺序执行任务

/* = 全局设置
 -------------------------------------------------------------- */
var srcPath = {
    src	: 'src',
    css		: 'src/css',
    script	: 'src/js',
    image	: 'src/images'
};
var destPath = {
    src	: 'dist',
    css		: 'dist/css',
    script	: 'dist/js',
    image	: 'dist/images'
};


/* = 开发环境( Ddevelop Task )
 -------------------------------------------------------------- */
// HTML处理
gulp.task('html', function() {
    var sources = gulp.src([destPath.src+'/js/*.min.js',destPath.src+'/css/*.min.css'],{read:false});
    return gulp.src( srcPath.src+'/**/*.html' )
        .pipe(changed( destPath.src ))
        .pipe(inject(sources, {
            transform: function (filepath) {
                if (filepath.slice(-4) === '.css') {
                    return '<link rel="stylesheet" type="text/css" href='+filepath.replace('/dist/','')+' />';
                }
                if (filepath.slice(-3) === '.js') {
                    return '<script src='+filepath.replace('/dist/','')+'></script>';
                }
                // Use the default transform as fallback:
                return inject.transform.apply(inject.transform, arguments);
            }
        }))
        .pipe(gulp.dest( destPath.src ));
});
// 样式处理
gulp.task('sass', function () {
    return gulp.src(srcPath.css+'/**/*.scss')
        .pipe(concat('libs.css')) // 合并成libs.css
        .pipe(rename({ suffix: '.min' })) // 重命名
        .pipe(sass({outputStyle: 'compressed'}) // 指明源文件路径、并进行文件匹配（编译风格：压缩）
            .on('error', sass.logError)) // 显示错误信息
        .pipe(gulp.dest(destPath.css)) // 输出路径
});
// JS文件压缩&重命名
gulp.task('script', function() {
    return gulp.src( [srcPath.script+'/*.js','!'+srcPath.script+'/*.min.js'] ) // 指明源文件路径、并进行文件匹配，排除 .min.js 后缀的文件
        .pipe(changed( destPath.script )) // 对应匹配的文件
        .pipe(concat('libs.js')) // 合并成libs.js
        .pipe(rename({ suffix: '.min' })) // 重命名
        .pipe(uglify()) // 使用uglify进行压缩，并保留部分注释
        .pipe(gulp.dest( destPath.script )); // 输出路径
});
// imagemin 图片压缩
gulp.task('images', function(){
    return gulp.src( srcPath.image+'/**/*' ) // 指明源文件路径，如需匹配指定格式的文件，可以写成 .{png,jpg,gif,svg}
        .pipe(changed( destPath.image ))
        .pipe(imagemin({
            progressive: true, // 无损压缩JPG图片
            svgoPlugins: [{removeViewBox: false}], // 不要移除svg的viewbox属性
            use: [pngquant()] // 深度压缩PNG
        }))
        .pipe(gulp.dest( destPath.image )); // 输出路径
});

// 本地服务器
gulp.task('webserver', function() {
    gulp.src( destPath.src ) // 服务器目录（.代表根目录）
        .pipe(webserver({ // 运行gulp-webserver
            livereload: true, // 启用LiveReload
            open: true // 服务器启动时自动打开网页
        }));
});
// 监听任务
gulp.task('watch',function(){
    // 监听 html
    gulp.watch( srcPath.src+'/**/*.html' , ['html'])
    // 监听 scss
    gulp.watch( srcPath.css+'/*.scss' , ['sass']);
    // 监听 images
    gulp.watch( srcPath.image+'/**/*' , ['images']);
    // 监听 js
    gulp.watch( [srcPath.script+'/*.js','!'+srcPath.script+'/*.min.js'] , ['script']);
});
// 默认任务
gulp.task('default',['webserver','watch']);
// 打包发布
gulp.task('build', function(callback){ // 开始任务前会先执行[clean]任务
    runSequence('clean',
        ['sass', 'script', 'images'],
        'html',
        callback);
});


/* = 发布环境( Release Task )
 -------------------------------------------------------------- */
// 清理文件
gulp.task('clean', function() {
    return del([destPath.src+'/']).then(function(paths) {
        console.log('Deleted files and folders:\n', paths.join('\n'));
    });
});
// 清理json文件
gulp.task('clean-json', function() {
    return del([destPath.src+'/json']).then(function(paths) {
        console.log('Deleted files and folders:\n', paths.join('\n'));
    });
});
// 清理build-hash留下来的.min文件
gulp.task('clean-min-js-css', function() {
    return del([destPath.src+'/js/*.min.js',destPath.src+'/css/*.min.css']).then(function(paths) {
        console.log('Deleted files and folders:\n', paths.join('\n'));
    });
});
// HTML处理
gulp.task('htmlRelease', function() {
    var sources = gulp.src([destPath.src+'/js/*.min.js',destPath.src+'/css/*.min.css'],{read:false});
    return gulp.src( [ destPath.src+'/json/*.json',srcPath.src+'/**/*.html'] )
        .pipe(inject(sources))
        .pipe(revCollector({
            replaceReved: true,
            dirReplacements: {  //把destPath.css替换前面的css
                '/dist/css': 'css',
                '/dist/js/': 'js'
            }
        }))
        .pipe(gulp.dest( destPath.src ));
});
// 样式处理
gulp.task('sassRelease', function () {
    return gulp.src(srcPath.css+'/**/*.scss')
        .pipe(concat('libs.css')) // 合并成libs.css
        .pipe(rename({ suffix: '.min' })) // 重命名
        .pipe(sass({outputStyle: 'compressed'}) // 指明源文件路径、并进行文件匹配（编译风格：压缩）
            .on('error', sass.logError)) // 显示错误信息
        .pipe(gulp.dest(destPath.css)) // 输出路径
        .pipe(hash())    //文件名增加hash值
        .pipe(gulp.dest(destPath.css)) // 输出路径
        .pipe(hash.manifest('css.json', { // Switch to the manifest file
            deleteOld: true,
            sourceDir: destPath.src + '/css'
        }))
        .pipe(gulp.dest(destPath.src + '/json')); // Write the manifest file
});
// 脚本压缩&重命名
gulp.task('scriptRelease', function() {
    return gulp.src( [srcPath.script+'/*.js','!'+srcPath.script+'/*.min.js'] ) // 指明源文件路径、并进行文件匹配，排除 .min.js 后缀的文件
        .pipe(concat('libs.js')) // 合并成libs.js
        .pipe(rename({ suffix: '.min' })) // 重命名
        .pipe(uglify()) // 使用uglify进行压缩，并保留部分注释
        .pipe(gulp.dest(destPath.script)) // 输出路径
        .pipe(hash())    //文件名增加hash值
        .pipe(gulp.dest(destPath.script)) // 输出路径
        .pipe(hash.manifest('js.json', { // Switch to the manifest file
            deleteOld: true,
            sourceDir: destPath.src + '/js'
        }))
        .pipe(gulp.dest(destPath.src + '/json')); // Write the manifest file
});
// imagemin 图片压缩
gulp.task('imagesRelease', function(){
    return gulp.src( srcPath.image+'/**/*' ) // 指明源文件路径，如需匹配指定格式的文件，可以写成 .{png,jpg,gif,svg}
        .pipe(imagemin({
            progressive: true, // 无损压缩JPG图片
            svgoPlugins: [{removeViewBox: false}], // 不要移除svg的viewbox属性
            use: [pngquant()] // 深度压缩PNG
        }))
        .pipe(gulp.dest( destPath.image )); // 输出路径
});
// 打包发布-hash版本
gulp.task('build-hash', function(callback){ // 开始任务前会先执行[clean]任务
    runSequence('clean',
        ['sassRelease', 'scriptRelease', 'imagesRelease'],
        'htmlRelease', 'clean-json','clean-min-js-css',
        callback);
});

/* = 帮助提示( Help )
 -------------------------------------------------------------- */
gulp.task('help',function () {
    console.log('----------------- 开发环境 -----------------');
    console.log('gulp default		开发环境（默认任务）');
    console.log('gulp html		HTML处理');
    console.log('gulp sass		样式处理');
    console.log('gulp script		JS文件压缩&重命名');
    console.log('gulp images		图片压缩');
    console.log('---------------- 发布环境 -----------------');
    console.log('gulp build		打包发布');
    console.log('gulp build-hash		打包发布hash版');
    console.log('gulp clean		清理文件');
    console.log('gulp sassRelease		样式处理');
    console.log('gulp scriptRelease	脚本压缩&重命名');
    console.log('---------------------------------------------');
});
