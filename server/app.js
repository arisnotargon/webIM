// TODO: 拆分成多个模块,全部导入到入口文件执行

let express = require('express');
let cookie = require('cookie')
let app = express();

let cookieParser = require('cookie-parser');
let utils = require('./utils');

app.use(cookieParser())


//以cookies为键,存储用户名,过期时间,链接信息等
//{ '6e86488c-94fb-4605-95f7-ca36d5b2d9b3': { name: 'asdf', expired_at: 1550934644286,wsLink=链接对象 } }
let userInfo = {};

//聊天室及成员列表,目前只有一个聊天室,日后扩展使用MongoDB管理
//结构
// [
//   {
//聊天室名
//     "name" : '游戏交流',
//聊天室id
//     "id" : 1,
//聊天室用户ssid列表
//     "userList": [
//       "213e02eb-37c1-463e-b18c-b837863518d6"
//     ],
//该聊天室的消息列表,理论上是按照时间正序排列好的,每次收到消息append进去,日后有了注册机制可能装用户id等
//     "msgList": [
//        {"nickName":"aaa","sendTime":1550853969543,"content":"消息内容纯文本"}
//     ]
//   }
// ]
let roomList = [
  {
    "name": "default",
    "id": 1,
    "userList": [],
    //消息列表
    "msgList": [
      {"nickName":"aaa","sendTime":1550853969543,"content":"消息内容纯文本"},
    ]
  }
]

//跨域统一处理,请求体统一处理
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true')

  if (req.method == 'OPTIONS') {
    res.sendStatus(200);
  } else if (['POST', 'PUT', 'DELETE'].indexOf(req.method) >= 0) {
    //处理请求体
    let body = '';
    //chunk拼接请求体,真烦
    req.on('data', function (chunck) {
      body += chunck;
    });
    req.on('end', function () {
      //拼出的请求体赋值到req.body属性,调用next继续后面
      req.body = body;
      next();
    });
  } else {
    next();
  }
});

app.get('/', function (req, res) {
  //用了cookie-parser中间件之后会多一个req.cookies对象,里面是处理成键值对的cookie
  // console.log(req.cookies);
  res.send('it works');
});

app.get('/getUserInfo', function (request, response) {
  let sessionId = '';
  if (request.headers.ssid) {
    sessionId = request.headers.ssid
  }

  if (!sessionId || sessionId.length !== 36 || !userInfo[sessionId]) {
    // 无用户信息返回401,重新设置用户名和建立ws链接
    response.status(401).send('{"status":"not authorised"}')
  } else {
    // 有用户信息返回用户名等信息
    console.log('有cookie');
    console.log(userInfo[sessionId])
    // 用户信息续命
    userInfo[sessionId].expired_at += 3600 * 1000
    response.send(`{"status":"ok","nickName":"${userInfo[sessionId].name}"}`);
  }
});

app.post('/setInfo', function (request, response) {
  //当前时间毫秒时间戳
  let sessionId = '';
  if (request.headers.ssid) {
    sessionId = request.headers.ssid
  }

  let nowMts = Date.now();

  let body = JSON.parse(request.body);
  let ssid = '';

  if (!sessionId || sessionId.length !== 36 || !userInfo[sessionId]) {
    // cookies中无sessionId则给他生成一个
    ssid = utils.addUser(userInfo, body.name);
  } else {
    if (userInfo[sessionId].expired_at < nowMts) {
      //据说delete会使对象变成慢对象
      delete userInfo[sessionId];
      ssid = utils.addUser(userInfo, body.name);
    } else {
      ssid = utils.editUser(userInfo, sessionId, body.name);
    }
  }

  response.send(`{"status":"ok","ssid":"${ssid.ssid}","expired_at":${ssid.expired_at}}`);
});

//http部分监听8088
let server = app.listen(8088, function () {
  console.log('listen');
  console.log(server.address().port);
});

const WebSocket = require('ws');

const WebSocketServer = WebSocket.Server;

// 实例化:
const wsServer = new WebSocketServer({
    port: 3000
});

wsServer.on('connection', (ws, req) => {
  console.log(userInfo)
  //ws是对应客户端的连接实例
  console.log(cookie.parse(req.headers.cookie));
  let jsonCookie = cookie.parse(req.headers.cookie);
  console.log('已连接客户端')
  if (!jsonCookie.ssid) {
    console.log('无登录认证头');
    //401要求重新登录
    ws.send(`{"code":401}`);
  } else if(!userInfo[jsonCookie.ssid]) {
    console.log('无认证头对应用户信息');
    ws.send(`{"code":401}`);
  } else if(userInfo[jsonCookie.ssid].expired_at < Date.now()) {
    console.log('认证过期');
    ws.send(`{"code":401}`);
  } else {
    //如果当前用户不在指定房间将当期用户ssid推进聊天室用户列表数组
    if(roomList[0].userList.indexOf(jsonCookie.ssid) >= 0) {
      roomList[0].userList.push(jsonCookie.ssid);
    }
    // 将用户链接加入到用户属性中,断开时设空
    userInfo[jsonCookie.ssid].wsLink = ws;
    console.log(roomList);
    //处理消息
    let retList = {};
    roomList.forEach((val) => {
      console.log(val.userList.indexOf(jsonCookie.ssid))
      if(val.userList.indexOf(jsonCookie.ssid) >= 0) {
        retList[val.id] = {
          "name": val.name,
          "id": val.id,
          "msgList": val.msgList.slice(-20)
        }
      }
    })
    ws.send(
      JSON.stringify({
        "code": 200,
        // 类型为初始化前端消息列表
        "type": "initList",
        "list": retList
      })
    )
  }

  ws.on('message',(msg) => {
    // todo:认证续命
    // 压入对应聊天室消息记录数组,并推送给该聊天室全部成员
    if (!userInfo[jsonCookie.ssid] || userInfo[jsonCookie.ssid].expired_at < Date.now()) {
      // 返回401并断开
      ws.send(JSON.stringify(
        {
          "code": 401,
          "type": "error",
          "msg": "认证无效或认证过期"
        }
      ));

      ws.close();

      return
    }

    console.log(msg)
    msg = JSON.parse(msg)
    console.log(msg.content)
    let sendRoomInx = null;
    //压入
    roomList.forEach((v,k)=> {
      console.log(k,v)
      if (v.id === msg.roomId) {
        sendRoomInx = k;
        let currentMsg =  {
          "nickName": userInfo[jsonCookie.ssid].name,
          "sendTime": Date.now(),
          "content": msg.content
        };
        roomList[k].msgList.push(currentMsg);
        console.log('roomList',roomList)

        console.log()

        //遍历当前收到消息所属的房间的用户列表
        roomList[sendRoomInx].userList.forEach(ssidv => {
          console.log('ssid:',ssidv)
          // console.log('')
          if (userInfo[ssidv] && userInfo[ssidv].expired_at >= Date.now() && userInfo[ssidv].wsLink) {
            userInfo[ssidv].wsLink.send(
              JSON.stringify({
                'code': 200,
                'type': 'msg',
                'sendTime': currentMsg.sendTime,
                'nickName': currentMsg.nickName,
                'content': msg.content
              })
            );
          }
        });
      }
    });
  });
})
