<template>
  <div class="hello">
    <div class="fix-top">
      <div v-if="loginAlter">{{loginAlter}}</div>
      <div v-if="nickName==null">请先设置昵称</div>
      <div v-else>当前昵称:<span v-html="nickName"></span></div>
      操作区
      <input id="namein" type="text" v-model="nickName" /><button @click="setName()">提交昵称</button>
    </div>
    <div class="show-zone">
      显示区
      <div v-if=" msgList[msgShowListId]">
        <div v-for="(msg,index) in msgList[msgShowListId].msgList" :key="index">
          {{msg.nickName}} 于 {{msg.sendTime/1000 |formatDate}} 说:
          <br >
          {{msg.content}}
        </div>
      </div>
      <input id="contentin" type="text" ref="contentInput" v-model="inputContent" /><button @click="sendContent()">发送</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import utils from '../utils/utils'

export default {
  name: 'Index',
  mounted () {
    let ssid = utils.getCookie('ssid')
    this.ssid = ssid
    if (ssid) {
      this.getName()
    }
  },
  filters: {
    formatDate:function (date) {
      var d = new Date(date)
      var year = d.getFullYear()
      var month = d.getMonth() + 1
      var day = d.getDate() <10 ? '0' + d.getDate() : '' + d.getDate()
      var hour = d.getHours()
      var minutes = d.getMinutes()
      var seconds = d.getSeconds()
      return  year+ '-' + month + '-' + day + ' ' + hour + ':' + minutes + ':' + seconds
    }
  },

  data () {
    return {
      nickName: null,
      serverUrl: 'http://127.0.0.1:8088',
      wsUrl: 'ws://127.0.0.1:3000',
      ssid: null,
      loginAlter: null,
      wsLink: null,
      inputContent: null,
      msgList: [],
      msgShowListId: null,
      // 断开链接的情况下点击发送推送进这里
      whiteSend: [],
      // 待发送锁
      whiteSendLock: false
    }
  },

  methods: {
    setName () {
      // 请求服务器设置昵称的接口
      let headers = {}
      if (this.ssid) {
        headers['ssid'] = this.ssid
      }
      axios.post(this.serverUrl + '/setInfo',
        {name: this.nickName},
        {
          headers: headers
        }
      ).catch(err => {
        console.log('errrrrrrr')
        console.log(err)
      }).then(res => {
        if (!res) {
          return
        }
        console.log(res)
        utils.setCookie('ssid', res.ssid, res.expired_at)
        this.ssid = res.ssid
        this.loginAlter = null
        // 设置昵称后打开ws链接
        if (!this.wsLink) {
          this.initWsLink()
        }
      })
    },

    getName () {
      let headers = {}
      if (this.ssid) {
        headers['ssid'] = this.ssid
      }

      axios.get(this.serverUrl + '/getUserInfo', {
        headers: headers
      }).catch(err => {
        console.log(err.response)
        if ([401, 403].indexOf(err.response.status) >= 0) {
          // 服务端没有对应的用户或登录过期
          if (this.ssid) {
            utils.delCookie(this.ssid)
            this.ssid = null
            this.loginAlter = '会话过期,需重新设置昵称'
          } else {
            this.loginAlter = '请先设置昵称'
            this.nickName = null
          }
          // todo:ws断线并且用新的token重连
        }
      }).then(res => {
        if (!res) {
          return 1
        }
        this.nickName = res.nickName
        console.log(this.nickName, res)
        // 获取昵称后打开ws链接
        this.initWsLink()
      })
    },
    initWsLink () {
      if (!this.ssid) {
        // 提示无身份认证token
        this.$message.error('无认证信息')
        return
      }

      if (this.wsLink === null) {
        this.wsLink = new WebSocket(this.wsUrl)
      }

      this.wsLink.onopen = e => {
        // 打开链接时检查有无
        if (!this.whiteSendLock) {
          this.whiteSendLock = true
          this.whiteSend.forEach(val => {
            this.wsLink.send(JSON.stringify(
              {
                'roomId': 1,
                'content': val
              }
            ))
          });
          this.whiteSendLock = false
        }
        console.log('ws open')
        console.log(e)
      }

      this.wsLink.onmessage = e => {
        console.log('ws messege')
        console.log(e)
        let resData = JSON.parse(e.data)
        console.log('wsdata:', resData)
        if (!resData.code) {
          console.log('无code为错误数据,跳过不管')
        } else if (resData.code === 401) {
          console.log('重新登录')
          this.setName()
        } else if (resData.code === 200) {
          this.wsMsgHandle(resData)
        }
      }

      this.wsLink.onclose = e => {
        console.log('ws close')
        console.log(e)
        // 断开后链接属性设空
        this.wsLink = null
        // todo:根据断开类型判断是否重连

      }

    },

    sendContent () {
      // 判断是否有ws链接,如果没有先建立链接,建立失败(无token等)再要求重设昵称
      if (this.wsLink === null) {
        this.whiteSend.append(this.inputContent)
        this.inputContent = null
        this.initWsLink()
      } else {
        this.wsLink.send(JSON.stringify(
          {
            'roomId': this.msgShowListId,
            'content': this.inputContent
          }
        ))
        this.inputContent = null
      }

      // console.log(this.initWsLink)
    },

    wsMsgHandle (resData) {
      // 收到ws正常数据的处理,增加消息列表数组等操作
      if (resData.type === 'initList') {
        console.log('初始化历史聊天记录')
        // 存放全部聊天室的消息记录,虽然目前只有一个,每次init都重置本地消息记录
        this.msgList = resData.list
        // 直接把目前唯一一个聊天室设为显示的聊天室
        this.msgShowListId = 1
      } else if (resData.type === 'msg') {
        console.log('in single smg')
        // 收到单条消息
        this.msgList[resData.roomId].msgList.push({
          content: resData.content,
          nickName: resData.nickName,
          sendTime: resData.sendTime
        })
        console.log('========================>')
        console.log(this.msgList[resData.roomId].msgList)
        console.log(resData)
      }
    }
  }

}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.fix-top {
  position: fixed;
  margin-left: 50%;
  width: 80%;
  height: 150px;
  background-color: #42b983;
}
.show-zone {
  background-color: brown;
}
</style>
