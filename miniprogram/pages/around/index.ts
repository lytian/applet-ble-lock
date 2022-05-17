// pages/around/index.ts
import { ab2hex } from '../../utils/util';

const app = getApp<IAppOption>();

Page({
  data: {
    deviceList: [] as any[],
    searching: false,
    listWidth: 0,
    listHeight: 0,
  },
  onLoad() {
    this.setData({
      listWidth: app.getWindowWidth() - 32,
      listHeight: app.getWindowHeight() - 82
    })
  },
  onShow() {
    if (wx.setKeepScreenOn) {
      wx.setKeepScreenOn({
        keepScreenOn: true,
        success: function () {
          //console.log('保持屏幕常亮')
        }
      })
    }

    this.searchBLE();
  },
  onUnload() {
    wx.stopBluetoothDevicesDiscovery({
    });
  },

  searchBLE() {
    const that = this
    if (this.data.searching) {
      // 停止搜索
      wx.stopBluetoothDevicesDiscovery({
        success: function () {
          that.setData({
            searching: false
          })
        }
      })
      return
    }
    wx.closeBluetoothAdapter({
      complete: function () {
        wx.openBluetoothAdapter({
          success: function () {
            wx.onBluetoothAdapterStateChange(function (res) {
              that.setData({
                searching: res.discovering
              })
              if (!res.available) {
                wx.removeStorageSync('selectedDevice')
                that.setData({
                  deviceList: [],
                  searching: false
                })
              }
            })
            wx.onBluetoothDeviceFound(function (res) {
              if (res.devices == null) {
                return;
              }
              let tempDevice = res.devices[0];
              const advertisData = ab2hex(tempDevice.advertisData);
              // 过滤bzc
              if (!advertisData.startsWith('7a6263')) {
                return;
              }
              const curDevice = {
                name: tempDevice.localName ?? '空',
                deviceId: tempDevice.deviceId,
                RSSI: tempDevice.RSSI,
                advertisData: advertisData || '空',
                deviceNo: tempDevice.localName ? tempDevice.localName.substr(-8, 8) : '',
                deviceType: advertisData ? advertisData.substr(6, 2) : '',
              };
              // 剔除重复设备
              const deviceList = that.data.deviceList;
              const d = deviceList.find(o => o.deviceId === tempDevice.deviceId)
              if (d != null) {
                d.RSSI = tempDevice.RSSI
              } else {
                deviceList.push(curDevice)
              }
              that.setData({
                deviceList: deviceList
              })
            })
            wx.startBluetoothDevicesDiscovery({
              allowDuplicatesKey: false,
              services: ['1801', '180A'],
              success: function () {
                that.setData({
                  searching: true,
                  deviceList: []
                })
                setTimeout(() => {
                  wx.getBluetoothDevices({
                    success(res) {
                      if (res.devices.length == 0) {
                        wx.showModal({
                          title: '没有找到可用的蓝牙设备',
                          content: '请手机开启位置权限',
                          showCancel: false
                        })
                        that.setData({
                          searching: false,
                          deviceList: [],
                        })
                      }
                    }
                  })
                }, 3000);
              }
            })
          },
          fail: function () {
            wx.showModal({
              title: '提示',
              content: '请检查手机蓝牙是否打开',
              showCancel: false,
              success: function () {
                wx.removeStorageSync('selectedDevice')
                that.setData({
                  searching: false,
                  deviceList: []
                })
              }
            })
          }
        })
      }
    });
  },
  async connectDevice(e: WechatMiniprogram.TouchEvent) {
    const that = this;
    wx.stopBluetoothDevicesDiscovery({
      success: function () {
        that.setData({
          searching: false
        });
      }
    });
    const device = this.data.deviceList.find(o => o.deviceId === e.currentTarget.id)
    wx.setStorageSync('selectedDevice', device);
    wx.showLoading({
      title: '连接蓝牙设备中...'
    })
    wx.createBLEConnection({
      deviceId: e.currentTarget.id,
      timeout: 5000,
      success: function () {
        wx.showToast({
          title: '连接成功',
          icon: 'success',
          duration: 2000
        });
        wx.redirectTo({
          url: '/pages/index/index?isConnected=1'
        });
      },
      fail: function (res) {
        if (res.errCode == -1 && res.errMsg.match("already connect")) {
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
      },
      complete: function () {
        wx.hideLoading();
      }
    });
  },
})