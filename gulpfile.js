//all the requisites below
var gulp = require('gulp'),
    args = require('yargs').argv,
    browserSync = require('browser-sync');
    config = require('./gulp.config')(),
    del = require('del'),
    $ = require('gulp-load-plugins')({lazy: true}),
    
    port = process.env.PORT || config.defaultPort;

//JS doctors
gulp.task('vet', function(){
    log('Analyzing code with JSHINT and JSCS.');
    
    return gulp
        .src(config.alljs)
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reported('fail'));
});

//LESS to css
gulp.task('styles', ['clean-styles'], function(){
    log('Compiling less to css.');
    
    return gulp
        .src(config.less)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({browsers: ['last 2 version', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

//clean
gulp.task('clean-styles', function(done){
    var files = config.temp+'**/*.css';
    clean(files, done);// gulp-clean
});

//watch for change
gulp.task('less-watcher', function(){
    gulp.watch([config.less], ['styles']);
});

//add css + js to html
gulp.task('wiredep', function(){
    log('Wireup the bower css js and our app js into the html');
    var options = config.getWiredepDefaultOptions;
    var wiredep = require('wiredep').stream;
    
    return gulp
        .src(config.index) //index.html
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});


gulp.task('inject', ['wiredep', 'styles'], function(){
    log('Wireup the app css into the html and call wiredep');
    return gulp
        .src(config.index) //index.html
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

//run it all
gulp.task('exec', ['inject'], function(){
    var isDev = true;
    
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev? 'dev' : 'build'
        },
        watch: [config.server]
    };
    return $.nodemon(nodeOptions)
        .on('restart', ['vet'], function(ev){
            log('*** nodemon restarted ***');
            log('files changed on restart:\n'+ev);
//            setTimeout(function(){
//                browserSync.notify('reloading now...');
//                browserSync.reload({stream: false});
//            }, config.browserReloadDelay); 
        })
        .on('start', function(){
            log('*** nodemon started ***');
            startBrowserSync();
        })
        .on('crash', function(){
            log('*** nodemon crashed: script failed ***');
        })
        .on('exit', function(){
            log('*** nodemon exited cleanly ***');
        });
    
});

///
function changeEvent(event){
    log('File '+event.path.replace(config.source, '')+' '+event.type);
}

function startBrowserSync(){
    //check if bs is already running
    if(browserSync.active){
        return;
    }
    
    log('Starting browser-sync on port '+ port);

    gulp.watch([config.less], ['styles'])
        .on('change', function(event){ changeEvent(event)});
    
    var options = {
        proxy: 'localhost:'+port,
        port: 3000,
        files: [config.client+'**/*.*',
                '!'+config.less,
                config.temp+'**/*.css'],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true, 
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 0//1000
    };
    
    browserSync(options);
}

function errorLogger(error){
    log('*** Start of Error ***');
    log(error);
    log('*** End of Error ***');
    this.emit('end');
}

function clean(path, done){
    log('Cleaning: '+$.util.colors.blue(path));
    del(path, done);
}

function log(msg){
    $.util.log($.util.colors.blue(msg));
}