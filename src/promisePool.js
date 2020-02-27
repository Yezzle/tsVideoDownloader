module.exports = class PromisePool{
    constructor(tasks, size, cb){
        this.size = size
        this.tasks = tasks
        this.cb = cb
        this.init()
    }

    init(){
        this.pointer = 0;
        this.state = 'pending'
    }

    start(){
        this.state = 'running'
        for(let i=0; i< this.size; i++){
            this.pointer = i
            let t = this.tasks[this.pointer]
            t&&this.runTask(t)
        }
    }

    next(){
        this.pointer++
        if(this.tasks[this.pointer]){
            this.runTask(this.tasks[this.pointer])
        }else{
            this.onEnd()
            this.state = 'ended'
        }
    }

    onEnd(){
        cb&&cb()
    }

    runTask(task){
        task().then(this.next.bind(this))
    }

    push(...tasks){
        this.tasks.push(...tasks)
    }
}