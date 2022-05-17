// index.ts
import { SERVICE_UUID, READ_UUID, WRITE_UUID, P_KEY } from '../../utils/constant';
import http from "../../utils/http";
import { ab2hex } from "../../utils/util";

// 获取应用实例
// const app = getApp<IAppOption>();
let sendTime: number;
Page({
  data: {
    selectedDevice: null as (any | null),
    isConnected: false
  },
  onLoad(option: any) {
    this.setData({
      isConnected: option.isConnected === '1'
    });
  },
  onShow() {
    const device = wx.getStorageSync('selectedDevice');
    if (device) {
      this.setData({
        selectedDevice: device,
      });
      if (!this.data.isConnected) {
        wx.showLoading({
          title: '连接蓝牙设备中...'
        })
        wx.openBluetoothAdapter({
          success: () => {
            wx.createBLEConnection({
              deviceId: device.deviceId,
              timeout: 5000,
              success: () => {
                wx.hideLoading();
                this.setData({
                  isConnected: true
                });
                wx.showToast({
                  title: '连接成功',
                  icon: 'success',
                  duration: 2000
                });
                this.onBLEValueChange();
              },
              fail: (res) => {
                wx.hideLoading();
                if (res.errCode == -1 && res.errMsg.match("already connect")) {
                  this.setData({
                    isConnected: true
                  });
                  wx.showToast({
                    title: '已连接成功',
                    icon: 'success',
                    duration: 2000
                  })
                } else if (res.errCode == 10003) {
                  wx.showToast({
                    title: '蓝牙已断开',
                    icon: 'none',
                    duration: 2000
                  })
                } else if (res.errCode == 10012) {
                  wx.showToast({
                    title: '连接蓝牙超时，请重连',
                    icon: 'none',
                    duration: 2000
                  })
                } else {
                  wx.showModal({
                    title: '提示',
                    content: '连接失败',
                    showCancel: false
                  })
                }
              }
            });
          }
        })
      } else {
        this.onBLEValueChange();
      }
    }
  },
  
  onBLEValueChange() {
    wx.notifyBLECharacteristicValueChange({
      deviceId: this.data.selectedDevice!.deviceId,
      serviceId: SERVICE_UUID,
      characteristicId: READ_UUID,
      state: true,
      success: () => {
        wx.onBLECharacteristicValueChange((res) => {
          if (res.value.byteLength < 3) return;
          const temp = new Uint8Array(res.value);
          let title: string;
          let icon: 'success' | 'error';
          // 功能码
          switch (temp[1]) {
            case 0xCF:
              if (temp[2] === 0x00) {
                let v = '';
                for (let i = 3; i < temp.length - 1; i++) {
                  v += String.fromCharCode(temp[i]);
                }
                wx.showToast({
                  title: '版本号：' + v,
                  icon: 'none',
                  duration: 2000
                })
              } else {
                wx.showToast({
                  title: '获取版本号失败',
                  icon: 'error',
                  duration: 2000
                })
              }
              break;
            case 0x81:
              if (temp[2] === 0x00) {
                wx.showToast({
                  title: '开锁成功',
                  icon: 'success',
                  duration: 2000
                })
              } else {
                wx.showToast({
                  title: '开锁失败',
                  icon: 'error',
                  duration: 2000
                })
              }
              break;
            case 0x82:
              switch (temp[2]) {
                case 0x00:
                  title = '锁具投运成功';
                  icon = 'success';
                  break;
                case 0x01:
                  title = '数据长度错误';
                  icon = 'error';
                  break;
                case 0x03:
                  title = '写入记录错误';
                  icon = 'error';
                  break;
                case 0xfe:
                  title = 'MAC效验错误';
                  icon = 'error';
                  break;
                default:
                  title = '锁具投运失败';
                  icon = 'error';
                  break;
              }
              wx.showToast({
                title: title,
                icon: icon,
                duration: 2000
              });
              break;
            case 0xC6:
              if (temp[2] === 0x00) {
                console.log(temp)
                console.log(temp.slice(3, temp.length - 1))
                http.loadingGet('/v0/open/code', {
                  lockCode: this.data.selectedDevice!.deviceNo,
                  lockType: this.data.selectedDevice!.deviceType,
                  pKey: P_KEY,
                  random: ab2hex(temp.slice(3, temp.length - 1))
                }).then((res: IHttpRes) => {
                  const cmd = [0x47]
                  for (let i = 0; i < res.data.length; i++) {
                    cmd.push(res.data.charCodeAt(i))
                  }
                  let sum = 0;
                  for (let i = 0; i < cmd.length; i++) {
                    sum += cmd[i];
                  }
                  cmd.push(sum);
                
                  this.sendData(cmd);
                });
              } else {
                wx.showToast({
                  title: '校验和错误',
                  icon: 'error',
                  duration: 2000
                })
              }
              break;
            case 0xC7:
              switch (temp[2]) {
                case 0x00:
                  title = '开锁成功';
                  icon = 'success';
                  break;
                case 0x01:
                  title = '校验和错误';
                  icon = 'error';
                  break;
                case 0x02:
                  title = '开锁验证失败';
                  icon = 'error';
                  break;
                case 0xff:
                  title = '其它错误';
                  icon = 'error';
                  break;
                default:
                  title = '开锁失败';
                  icon = 'error';
                  break;
              }
              wx.showToast({
                title: title,
                icon: icon,
                duration: 2000
              });
              break;
            default:
            break;
          }
        });
      }
    })
  },
  closeDevice() {
    this.setData({
      selectedDevice: null,
      deviceId: '',
      isConnected: false
    })
    wx.removeStorageSync('selectedDevice')
  },
  validateBLE(): boolean {
    if (this.data.selectedDevice == null || !this.data.isConnected) {
      wx.showToast({
        title: '请先连接锁具',
        icon: 'none',
      })
      return false;
    }
    if (sendTime != null && (Date.now() - sendTime) < 1200) {
      wx.showToast({
        title: '不要频繁点击',
        icon: 'none',
      })
      return false;
    }
    sendTime = Date.now();
    return true;
  },
  validateLogin(): boolean {
    if (!wx.getStorageSync('token')) {
      return false;
    }
    return true;
  },
  sendData(cmd: number[]) {
    if (cmd.length <= 19) {
      // 小于19个字符，单包发送
      cmd.splice(0, 0, 0x00);
      wx.writeBLECharacteristicValue({
        deviceId: this.data.selectedDevice!.deviceId,
        serviceId: SERVICE_UUID,
        characteristicId: WRITE_UUID,
        value: new Uint8Array(cmd).buffer,
        success: function () {
        },
        fail: function (res) {
          if (res.errCode==10006 || res.errCode==0) {
            wx.showToast({
              title: '蓝牙已断开',
              icon: 'none',
              duration: 2000
            })
          } else {
            wx.showToast({
              title: '指令发送失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      });
    } else {
      // 大于19字符，分包发送
      // 添加两个字节的长度
      cmd = [0x00, cmd.length].concat(cmd);
      const count = Math.ceil(cmd.length / 19);
      for (let i = 0; i < count; i++) {
        let temp: number[];
        if (((i + 1) * 19) < cmd.length) {
          temp = cmd.slice(i*19, (i+1)*19);
          temp.splice(0, 0, parseInt('0x8' + i));
        } else {
          temp = cmd.slice(i*19, cmd.length);
          temp.splice(0, 0, parseInt('0x0' + i));
        }
        setTimeout(() => {
          wx.writeBLECharacteristicValue({
            deviceId: this.data.selectedDevice!.deviceId,
            serviceId: SERVICE_UUID,
            characteristicId: WRITE_UUID,
            value: new Uint8Array(temp).buffer,
            success: function () {
            },
            fail: function (res) {
              if (res.errCode==10006 || res.errCode==0) {
                wx.showToast({
                  title: '蓝牙已断开',
                  icon: 'none',
                  duration: 2000
                })
              } else {
                wx.showToast({
                  title: '指令发送失败',
                  icon: 'none',
                  duration: 2000
                })
              }
            }
          });
        }, 100 * i);
      }
    }
  },

  getArround() {
    wx.navigateTo({
      url: '/pages/around/index'
    })
  },
  debugUnlock() {
    if (!this.validateBLE()) return;

    const cmd = [0x01]
    const now = new Date();
    cmd.push(now.getFullYear() % 100)
    cmd.push(now.getMonth() + 1)
    cmd.push(now.getDate())
    cmd.push(now.getHours())
    cmd.push(now.getMinutes())
    cmd.push(now.getSeconds())
    const phone: string = wx.getStorageSync('phone');
    for (let i = 0; i < phone.length; i++) {
      cmd.push(phone.charCodeAt(i))
    }
  
    this.sendData(cmd);
  },
  getVersion() {
    if (!this.validateBLE()) return;
    this.sendData([0x4f,0x4f]);
  },
  async lockUpload() {
    if (!this.validateBLE()) return;
    if (!(this.validateLogin())) return;
    http.loadingGet('/v0/lock/key', {
      lockCode: this.data.selectedDevice!.deviceNo,
      lockType: this.data.selectedDevice!.deviceType,
      pKey: P_KEY
    }).then((res: IHttpRes) => {
      const cmd = [0x02]
      const now = new Date();
      cmd.push(now.getFullYear() % 100)
      cmd.push(now.getMonth() + 1)
      cmd.push(now.getDate())
      cmd.push(now.getHours())
      cmd.push(now.getMinutes())
      cmd.push(now.getSeconds())
      const phone: string = wx.getStorageSync('phone');
      for (let i = 0; i < phone.length; i++) {
        cmd.push(phone.charCodeAt(i))
      }
      const lockKey: string = res.data;
      const len = Math.ceil(lockKey.length / 2);
      for (let j = 0; j < len; j++) {
        cmd.push(parseInt('0x' + lockKey.substr(j * 2, 2)));
      }
    
      this.sendData(cmd);
    });
  },
  onlineUnlock() {
    if (!this.validateBLE()) return;
    if (!(this.validateLogin())) return;

    const cmd = [0x46]
    const now = new Date();
    cmd.push(now.getFullYear() % 100)
    cmd.push(now.getMonth() + 1)
    cmd.push(now.getDate())
    cmd.push(now.getHours())
    cmd.push(now.getMinutes())
    cmd.push(now.getSeconds())
    const phone: string = wx.getStorageSync('phone');
    for (let i = 0; i < phone.length; i++) {
      cmd.push(phone.charCodeAt(i))
    }
    let sum = 0;
    for (let j = 0; j < cmd.length; j++) {
      sum += cmd[j];
    }
    cmd.push(sum);
  
    this.sendData(cmd);
  }
})
