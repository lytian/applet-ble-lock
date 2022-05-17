// pages/login/index.ts
import http from '../../utils/http';

Page({
  data: {
    loginLoading: false,
    phone: '',
    password: ''
  },
  onLoad() {
    this.setData({
      phone: wx.getStorageSync('phone'),
      password: wx.getStorageSync('password'),
    });
  },

  login() {
    if (this.data.loginLoading) return;
    if (!this.data.phone || this.data.phone.length !== 11) {
      wx.showToast({
        title: '无效的手机号码',
        icon: 'none'
      });
      return;
    } 
    if (!this.data.password || this.data.password.length < 6) {
      wx.showToast({
        title: '无效的登录密码',
        icon: 'none'
      });
      return;
    } 
    this.setData({
      loginLoading: true
    });
    http.loadingPost('/v0/login/auth', {
      phone: this.data.phone,
      password: this.data.password,
    }).then((res: IHttpRes) => {
      wx.setStorageSync('phone', this.data.phone);
      wx.setStorageSync('password', this.data.password);
      wx.setStorageSync('token', res.data);
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      wx.redirectTo({
        url: '/pages/index/index'
      })
    }).finally(() => {
      this.setData({
        loginLoading: false,
      });
    });
  }
})