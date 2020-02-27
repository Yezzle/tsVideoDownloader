
const fs = require('fs');
const TaskPool = require('./src/taskPool')
const maps = require('./src/maps')
const path = require('path')
const request = require('request');
// const cheerio = require('cheerio');

const basePath = path.resolve(__dirname, 'dist')
const resolvePath = (...p) => path.resolve(basePath, ...p)

const maxTryCount = 2 // 最大重试次数
const poolSize = 10; // 并行下载数量

let total; // 总任务数
let count = 0; // 计数器, 计算完成进度
/**
 * 
 * @param {*} url 
 * @param {*} callback 可选回调
 */
const createDownloadStream = (url, callback) => request.get(url, { timeout: 300000 } ,callback);

const writeStream = (stream, filepath) => {
    // let dir = path.basename(filepath);
    // // recursive选项会创建父级目录 
    // // 例如：
    // //    fs.mkdirSync('test/download', {recursive: true}) 同时创建test/download 和 test
    // if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true}) 
    stream.pipe(fs.createWriteStream(filepath, {flags: 'w+'})) // 直接将流导入到可写流即完成写入文件
}

const downloadFile = (url, filepath, resolve, reject) => {
    let downloadStream = createDownloadStream(url)
    downloadStream.on("complete",() => {resolve()})
    downloadStream.on("error", (e) => {
        e.url = url;
        e.filePath = filepath
        reject(e)
    })
    setTimeout(() => {
        reject('链接超时！')
    }, 500000);
    downloadStream.on('socket', (net_Socket) => {

    })
    downloadStream.on('pipe', (readable)=>{

    })

    writeStream(downloadStream , filepath)
}

const initDirs = () => {
    maps.map(o => {
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
                }, reject)
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

function begin(){
    initDirs()
    const tasks = maps.map(obj => getAllAssets(obj)).reduce((arr, pArr)=>{
        arr.push(...pArr)
        return arr;
    },[]).filter(p => typeof p == 'function')
    total = tasks.length;
    console.log(tasks)
    let pool = new TaskPool(tasks, poolSize,()=>{
        console.log('脚本执行成功！')
    })
    pool.start();
}

begin()