
const fs = require('fs');
const TaskPool = require('./src/taskPool')
const config = require('./src/config')
const path = require('path')
const request = require('request');
// const cheerio = require('cheerio');
const isReview = process.argv.includes('review');

const maxTryCount = config.maxTryCount || 2 // 最大重试次数
const poolSize = config.parallel || 10 // 并行下载数量

let total; // 总任务数
let count = 0; // 计数器, 计算完成进度
const basePath = path.resolve(__dirname, 'dist')
const resolvePath = (...p) => path.resolve(basePath, ...p)
/**
 * 创建下载流
 * @param {*} url 
 * @param {*} callback 可选回调
 */
const createDownloadStream = (url, callback) => request.get(url, { timeout: 300000, strictSSL: false } ,callback);

const writeStream = (stream, filepath) => {
    // let dir = path.basename(filepath);
    // // recursive选项会创建父级目录 
    // // 例如：
    // //    fs.mkdirSync('test/download', {recursive: true}) 同时创建test/download 和 test
    // if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true}) 
    stream.pipe(fs.createWriteStream(filepath, {flags: 'w+'})) // 直接将流导入到可写流即完成写入文件
}

const downloadFile = (url, filepath, resolve, reject, mapOption) => {
    if(isReview&&fs.existsSync(filepath)){
        let length  =fs.readFileSync(filepath).length
        if(length !== 0) return reject(length) //如果检查模式则跳过有长度的文件
    }else if(isReview){
        return reject('文件不存在')
    }

    let downloadStream = createDownloadStream(url)
    downloadStream.on("complete",() => {resolve()})
    downloadStream.on("error", (e) => {
        e.url = url;
        e.filePath = filepath
        reject(e)
    })
    let socket;
    setTimeout(() => {
        socket.destroy()
        reject('链接超时！')
    }, 500000);
    downloadStream.on('socket', (net_Socket) => {
        socket = net_Socket
    })
    downloadStream.on('pipe', (readable)=>{

    })

    writeStream(downloadStream , filepath)
}

const initDirs = () => {
    config.tasks.map(o => {
        let dir = resolvePath(o.name.replace(':',' '));
        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir)
        }
    })
}
const padZeroStart = ( targetStr , length) => {
    if(targetStr.length >= length) return targetStr;
    let pad = length - targetStr.length
    if( pad >= 1 ){
        let res = targetStr;
        for (let i = 0; i < pad; i++) {
            res = '0' + res;
        }
        return res;
    }
}

const getAllAssets = (obj) => {
    let arr = []
    let len = obj.length
    let dirName = obj.name.replace(':',' ')
    let filters = obj.filter
    let padZeroLength = obj.pad
    for(let i = 0; i< len; i++) {
        if(filters&&filters.length > 0){
            if(!filters.includes(i)&&!filters.some(ty =>ty instanceof Array && i>=ty[0] && i<= ty[1])) {
                continue
            }
        }
        let url = obj.url.replace('$', padZeroStart(`${i}`, padZeroLength))
        let file = resolvePath(dirName, `${i}.ts`)
        // arr.push(downLoad(url, file))
        let tryCount = 0;
        let getPromise = (i) => {
            if(i >= maxTryCount){
                console.log(`--下载失败：${url}, file: ${file}`);
                return ()=>{};
            } 
            return ()=> new Promise((resolve, reject) => {
                downloadFile(url, file, () => { 
                    count++; 
                    console.log(` ${ (count * 100 /total).toFixed(2)}% ` + '文件已被保存:', file, url);
                    resolve()
                }, reject, obj)
            }).catch(err =>{
                console.error(err, file)
                tryCount++;
                return getPromise(tryCount)
            })
        }
        arr.push(getPromise(0))
    }
    return arr;
}

const filterFunc = (m, i) => {
    return !m.done
}

function begin(){
    initDirs() //初始化文件夹路径
    // 初始化任务
    const tasks = config.tasks.filter(filterFunc).map(obj => getAllAssets(obj)).reduce((arr, pArr)=>{
        arr.push(...pArr)
        return arr;
    },[]).filter(p => typeof p == 'function')
    total = tasks.length;
    let pool = new TaskPool(tasks, poolSize,()=>{
        console.log('脚本执行成功！')
    })
    pool.start();
}
begin()