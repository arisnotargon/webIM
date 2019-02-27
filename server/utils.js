let uuid = require('node-uuid');
let underscore = require('underscore.string');

function addUser(userList, name) {
  //输入值转html实体
  name = underscore.escapeHTML(name);
  //过期时间100小时
  let expired_at = Date.now() + 360000 * 1000
  let ssid = uuid.v4();
  userList[ssid] = {
    name: name,
    expired_at: expired_at,
  };

  return {
    ssid:ssid,
    expired_at:expired_at
  };
}

function editUser(userList, ssid, name) {
  name = underscore.escapeHTML(name);
  userList[ssid].name = name;
  userList[ssid].expired_at =  Date.now() + 360000 * 1000;
  return {
    ssid:ssid,
    expired_at:userList[ssid].expired_at
  };
}

module.exports = {
  addUser : addUser,
  editUser : editUser
};
