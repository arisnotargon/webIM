package main

import (
	"crypto/md5"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func printForm(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	fmt.Println(r.Form)
	reData := ""
	for k, v := range r.Form {
		// fmt.Println(k, strings.Join(v, ""))
		reData += k + "====>" + strings.Join(v, "") + "\n"
	}
	fmt.Fprintf(w, reData)
}

func login(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		t, _ := template.ParseFiles("login.html")
		fmt.Print(t)
		t.Execute(w, nil)
	} else {
		r.ParseForm()
		for k, v := range r.Form {
			// fmt.Println(k, strings.Join(v, ""))
			fmt.Println(k, "=====>", v)
		}
		fmt.Fprintf(w, "username:%s\npassword:%s\n", r.FormValue("username"), strings.Join(r.Form["password"], ""))
		// r.FormValue("username")返回r.Form[0]
	}

}

func loginToken(w http.ResponseWriter, r *http.Request) {
	fmt.Println("method:", r.Method)
	if r.Method == "GET" {
		crutime := time.Now().Unix()
		h := md5.New()
		io.WriteString(h, strconv.FormatInt(crutime, 10))
		token := fmt.Sprintf("%x", h.Sum(nil))
		t, _ := template.ParseFiles("loginToken.html")
		t.Execute(w, token)
	} else {
		// 提交表单
		r.ParseForm()
		token := r.Form.Get("token")
		if token != "" {
			//验证token
			fmt.Fprintf(w, "存在token:%s\n", token)
		} else {
			//不存在token
			fmt.Fprintf(w, "不存在token")
		}
		template.HTMLEscape(w, []byte("username:"+r.Form.Get("username")))
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		crutime := time.Now().Unix()
		h := md5.New()
		io.WriteString(h, strconv.FormatInt(crutime, 10))
		token := fmt.Sprintf("%x", h.Sum(nil))
		t, _ := template.ParseFiles("upload.html")
		t.Execute(w, token)
	} else {
		r.ParseMultipartForm(32 << 20)
		file, handler, err := r.FormFile("uploadfile")
		if err != nil {
			fmt.Println(err)
			return
		}
		defer file.Close()
		fmt.Fprintf(w, "%v", handler.Header) //%v打印对应值的默认形式
		f, err := os.OpenFile("./"+handler.Filename, os.O_WRONLY|os.O_CREATE, 0666)
		if err != nil {
			fmt.Println(err)
			return
		}
		defer f.Close()
		io.Copy(f, file) //上传的文件复制到目标文件
		fmt.Fprintf(w, "上传成功,文件名:%s", handler.Filename)
	}
}

func main() {
	http.HandleFunc("/", printForm)
	http.HandleFunc("/login", login)
	http.HandleFunc("/loginToken", loginToken)
	http.HandleFunc("/upload", upload)
	err := http.ListenAndServe(":9090", nil)
	if err != nil {
		log.Fatal("err:", err)
	}
}
