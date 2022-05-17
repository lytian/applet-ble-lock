interface IAppOption {
  globalData: {
    sysInfo?: WechatMiniprogram.SystemInfo,
  },

  getWindowWidth: () => number,
  getWindowHeight: () => number,
}

interface IHttpRes {
  code: number,
  msg?: string,
  data?: any,
}