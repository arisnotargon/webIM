package main

import (
    "fmt"
    "log"
    "net/http"
    "strings"
    "io/ioutil"
    "bytes"
    "encoding/json"
    "time"
    "crypto/md5"
    "io"
    "strconv"
    "html/template"

)

func sayhelloName(w http.ResponseWriter, r *http.Request) {
    r.ParseForm() //解析url传递的参数，对于POST则解析响应包的主体（request body）
    //注意:如果没有调用ParseForm方法，下面无法获取表单的数据
    fmt.Println(r.Form) //这些信息是输出到服务器端的打印信息
    fmt.Println("path", r.URL.Path)
    fmt.Println("scheme", r.URL.Scheme)
    fmt.Println(r.Form["url_long"])
    for k, v := range r.Form {
        fmt.Println("key:", k)
        fmt.Println("val:", strings.Join(v, ""))
    }
    fmt.Fprintf(w, "Hello astaxie!1111") //这个写入到w的是输出到客户端的
}

func login(w http.ResponseWriter, r *http.Request) {
    fmt.Println("method:", r.Method) //获取请求的方法
    if r.Method == "GET" {
        t,err :=ioutil.ReadFile("login.gtpl")
        if err != nil {
            log.Println(err)
        }
        w.Write(t)
    }
    if r.Method == "PUT" {
        body, err := ioutil.ReadAll(r.Body)
        reqJson := ""
        if err == nil {
            reqJson = bytes.NewBuffer(body).String()
        } else {
            fmt.Println(err)
        }

        var user map[string]interface{}
        json.Unmarshal([]byte(reqJson), &user)
        fmt.Println(user)
    }
    if r.Method == "POST" {
        fmt.Fprintln(w,r.FormValue("username"))
        fmt.Fprintln(w,r.FormValue("password"))
    }
}

// 文件上传
func upload(w http.ResponseWriter, r *http.Request) {
    if r.Method == "GET" {
        crutime := time.Now().Unix()
        h := md5.New()
        io.WriteString(h, strconv.FormatInt(crutime, 10))
        token := fmt.Sprintf("%x", h.Sum(nil))

        t, err := template.ParseFiles(".\\upload.html")
        if err != nil{
            log.Println(err)
        }
        fmt.Fprint(w,t)
        _=token
        //t.Execute(w, token)
    }
}

func check(e error) {
    if e != nil {
        panic(e)
    }
}

func main() {
    http.HandleFunc("/", sayhelloName)       //设置访问的路由
    http.HandleFunc("/login", login)         //设置访问的路由
    http.HandleFunc("/upload", upload)         //设置访问的路由
    err := http.ListenAndServe(":9090", nil) //设置监听的端口
    if err != nil {
       log.Fatal("ListenAndServe: ", err)
    }
}
