import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 导出/导入这条路上的请求层。
 *
 * 这两个函数看着只是「发个 POST」，但踩坑点很集中：
 *
 * 1. RuoYi 的导出是 POST + **query 参数**（不是 body），并且**不返回
 *    Content-Disposition**，文件名只能前端自己拼。
 * 2. 导出失败时后端返回的是 **JSON**（HTTP 状态码可能还是 200）。
 *    不做区分的话，用户会下到一个名字像 Excel、打开报损坏的文件 ——
 *    这种问题在浏览器里很难查，所以在请求层就把它变成异常。
 */

const requestCall = vi.fn()

/** 假的 axios 实例：只要 request / interceptors 三个成员就够过了 */
const fakeInstance = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  request: (config: unknown) => requestCall(config),
}

vi.mock('axios', () => ({
  default: {
    create: () => fakeInstance,
  },
}))

const { download, upload, RuoYiError } = await import('@/api/request')

/** 造一个「后端把 AjaxResult 当文件返回」的 blob */
function jsonBlob(body: unknown): Blob {
  return new Blob([typeof body === 'string' ? body : JSON.stringify(body)], {
    type: 'application/json',
  })
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

describe('download（导出）', () => {
  beforeEach(() => {
    requestCall.mockReset()
  })

  it('用 POST + query 参数请求，并要求 blob 响应', async () => {
    requestCall.mockResolvedValue({ data: new Blob(['xlsx'], { type: XLSX_TYPE }) })

    await download('/system/user/export', { userName: 'admin' })

    expect(requestCall).toHaveBeenCalledWith({
      url: '/system/user/export',
      method: 'POST',
      params: { userName: 'admin' },
      responseType: 'blob',
    })
  })

  it('二进制响应原样返回', async () => {
    const blob = new Blob(['xlsx'], { type: XLSX_TYPE })
    requestCall.mockResolvedValue({ data: blob })

    await expect(download('/system/user/export')).resolves.toBe(blob)
  })

  it('后端把错误写成 JSON 时抛异常，而不是让用户下到一个损坏文件', async () => {
    requestCall.mockResolvedValue({
      data: jsonBlob({ code: 500, msg: '导出失败：导出数据量过大' }),
    })

    await expect(download('/system/user/export')).rejects.toThrow(RuoYiError)
    await expect(download('/system/user/export')).rejects.toThrow('导出失败：导出数据量过大')
  })

  it('会话过期的 JSON 也走异常（401 要能触发重新登录）', async () => {
    requestCall.mockResolvedValue({
      data: jsonBlob({ code: 401, msg: '认证失败，无法访问系统资源' }),
    })

    await expect(download('/system/user/export')).rejects.toThrow('认证失败，无法访问系统资源')
  })

  it('JSON 但内容不是 AjaxResult 时给一句能看懂的话', async () => {
    requestCall.mockResolvedValue({ data: jsonBlob('<html>502 Bad Gateway</html>') })

    await expect(download('/system/user/export')).rejects.toThrow(
      '导出失败：后端返回的不是 Excel 文件',
    )
  })
})

describe('upload（导入）', () => {
  beforeEach(() => {
    requestCall.mockReset()
  })

  it('把文件放进 FormData、updateSupport 放进请求参数', async () => {
    requestCall.mockResolvedValue({ data: { code: 200, msg: '导入成功 2 条' } })
    const formData = new FormData()
    formData.append('file', new File(['x'], 'users.xlsx'))

    const result = await upload('/system/user/importData', formData, { updateSupport: true })

    expect(requestCall).toHaveBeenCalledWith({
      url: '/system/user/importData',
      method: 'POST',
      data: formData,
      params: { updateSupport: true },
    })
    expect(result.msg).toBe('导入成功 2 条')
  })

  it('不手动写 Content-Type（手写会漏掉 boundary，后端报 not a multipart request）', async () => {
    requestCall.mockResolvedValue({ data: { code: 200, msg: 'ok' } })

    await upload('/system/user/importData', new FormData(), { updateSupport: false })

    const config = requestCall.mock.calls[0]![0] as Record<string, unknown>
    expect(config.headers).toBeUndefined()
  })

  it('后端返回失败码时抛 RuoYiError，把原始提示带出来', async () => {
    requestCall.mockResolvedValue({
      data: { code: 500, msg: '第 3 行手机号格式错误' },
    })

    await expect(upload('/system/user/importData', new FormData())).rejects.toThrow(
      '第 3 行手机号格式错误',
    )
  })
})
