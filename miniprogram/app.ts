// app.ts
App<IAppOption>({
  globalData: {
    sysInfo: undefined,
  },
  onLaunch: function () {
    this.globalData.sysInfo = wx.getSystemInfoSync();
  },
  getWindowWidth: function () {
    if (this.globalData.sysInfo == null) {
      return 0;
    }
    return this.globalData.sysInfo.windowWidth;
  },

  getWindowHeight: function () {
    if (this.globalData.sysInfo == null) {
      return 0;
    }
    return this.globalData.sysInfo.windowHeight;
  },
})