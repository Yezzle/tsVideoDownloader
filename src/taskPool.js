module.exports = class TaskPool{
    task = [];
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
        for(let i=0; i< Math.min(this.size, this.tasks.length); i++){
            this.pointer = i
            let t = this.tasks[this.pointer]
            if(t){
                this.runTask(t)
            } else {
                break
            }
        }
    }

    next(){
        this.pointer++
        if(this.tasks[this.pointer]){
            this.runTask(this.tasks[this.pointer])
        }else{
            this.size--  // 出栈
            if(this.size == 0){ 
                this.onEnd()
                this.state = 'ended'
            }
        }
    }

    onEnd(){
        this.cb&&this.cb()
    }

    runTask(task){
        task().then(this.next.bind(this))
    }

    push(...tasks){
        this.tasks.push(...tasks)
    }
}