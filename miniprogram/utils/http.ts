export const BASE_URL = 'https://www.bzccspt.com/sciot/api'

/** 退出登录 */
export function logout() {
  wx.removeStorageSync('token');
  wx.reLaunch({
    url: '/pages/login/index'
  });
}

// 参数过滤函数
function filterNull (o: any) {
  if (o == null) return
  for (let key in o) {
    if (o[key] === null) {
      delete o[key]
    }
    if (typeof o[key] === 'string') {
      o[key] = o[key].trim()
    } else if (typeof o[key] === 'object') {
      o[key] = filterNull(o[key])
    } 
  }
  return o
}

/**
 * 网络请求方法
 * @param {String} method 请求方式 GET、POST、PUT、DELETE、OPTIONS、
 * @param {String} url 请求地址   BASE_URL+url
 * @param {*} data 请求参数(已自动处理)
 * @param {Object} headerConf header参数
 * @param {Boolean} loading 是否显示加载中
 * @return {Promise} 返回Promise，只有正常返回数据时，才会resolve
 */
function request(
  method: "OPTIONS" | "GET" | "HEAD" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: any,
  headerConf?: object,
  loading?: boolean
): Promise<IHttpRes> {
  let requestURL = BASE_URL + url

  return new Promise((resolve, reject) => {
    loading && wx.showLoading({
      title: '正在加载中...',
      mask: true
    })
    wx.request({
      url: requestURL,
      method: method,
      data: data,
      header: {
        ...headerConf,
        'Content-Type': 'application/json',
        'Bzc-Token': wx.getStorageSync('token')
      },
      success: function (res) {
        loading && wx.hideLoading()
        if (res.statusCode != 200) {
          wx.showToast({
            title: "系统错误，请稍后再试！",
            icon: 'none',
            duration: 3 * 1000
          })
          return reject({
            code: res.statusCode
          });
        }
        const { code, msg, data } = res.data as any;
        if (code === 0) {
          resolve({
            code,
            msg,
            data,
          });
        } else if (code === 101) {
          // token过期
          logout();
          return false;
        } else if (msg) {
          wx.showToast({
            title: msg,
            icon: 'none'
          });
          reject(res.data);
        }
      },
      fail: function (err) {
        console.error(err)
        loading && wx.hideLoading()
        wx.showToast({
          title: "系统错误，请稍后再试！",
          icon: 'none',
          duration: 3 * 1000
        })
        reject(err)
      }
    })
  })
}

export default {
  request,
  /**
   * GET 请求
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  get: function (url: string, data?: any, header?: object) {
    return request('GET', url, filterNull(data), header);
  },
  /**
   * POST 请求
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  post: function (url: string, data?: any, header?: object) {
    return request('POST', url, data, header);
  },
  /**
   * PUT 请求
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  put: function (url: string, data?: any, header?: object) {
    return request('PUT', url, data, header);
  },
  /**
   * DELETE 请求
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  delete: function (url: string, data?: any, header?: object) {
    return request('DELETE', url, filterNull(data), header);
  },
  /**
   * GET 请求，显示加载中
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  loadingGet: function (url: string, data?: any, header?: object) {
    return request('GET', url, filterNull(data), header, true);
  },
  /**
   * POST 请求，显示加载中
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  loadingPost: function (url: string, data?: any, header?: object) {
    return request('POST', url, data, header, true);
  },
  /**
   * PUT 请求，显示加载中
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  loadingPut: function (url: string, data?: any, header?: object) {
    return request('PUT', url, data, header, true);
  },
  /**
   * DELETE 请求，显示加载中
   * @param {String} url 请求地址   BASE_URL+url
   * @param {*} data 请求参数
   * @param {Object} header header参数
   * @returns 返回Promise，只有正常返回数据时，才会resolve
   */
  loadingDelete: function (url: string, data?: any, header?: object) {
    return request('DELETE', url, filterNull(data), header, true);
  }
}