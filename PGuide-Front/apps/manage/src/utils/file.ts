/**
 * 文件下载小工具。
 *
 * 后端的导出接口（RuoYi `ExcelUtil.exportExcel(response, ...)`）直接把 xlsx
 * 二进制写进响应流，**不设置 Content-Disposition 头** ——
 * 所以文件名只能由前端自己拼，不能从响应头里读。
 *
 * 这一点和常见的「后端给 filename 前端解析」不一样，别去找响应头。
 */

/** 两位补零 */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 生成带时间戳的导出文件名。
 *
 * 形状：`用户_20260213153045.xlsx`
 *
 * 为什么要时间戳：RuoYi 后端一个用户可能连点两次导出，
 * 没有时间戳的话浏览器会得到两个同名文件（`用户 (1).xlsx`），
 * 时间戳让文件名本身就是可排序的版本标识。
 */
export function buildExportFilename(stem: string, extension = 'xlsx', now = new Date()): string {
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const safeStem = stem.trim() || '导出'
  return `${safeStem}_${stamp}.${extension}`
}

/**
 * 把 Blob 存成文件（走 `<a download>` + objectURL）。
 *
 * objectURL 用完必须释放，否则整个 Blob 会一直被浏览器攥在内存里；
 * 但**不能立刻释放** —— Firefox 在某些情况下会拿不到还在读的流，
 * 所以延后一拍（`setTimeout 0`）再 revoke。
 */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
