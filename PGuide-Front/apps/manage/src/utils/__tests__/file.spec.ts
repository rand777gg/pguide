import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildExportFilename, saveBlobAsFile } from '../file'

/**
 * 文件下载工具的测试。
 *
 * 这里能测的是「文件名怎么拼」和「有没有真的触发下载」——
 * 浏览器的实际落盘行为在 jsdom 里不存在，只能看到 `<a download>` 被点了一下。
 */

describe('buildExportFilename', () => {
  it('拼成「资源名_时间戳.xlsx」', () => {
    const now = new Date(2026, 1, 13, 15, 30, 45)
    expect(buildExportFilename('用户', 'xlsx', now)).toBe('用户_20260213153045.xlsx')
  })

  it('月日时分秒都补零', () => {
    const now = new Date(2026, 0, 2, 3, 4, 5)
    expect(buildExportFilename('角色', 'xlsx', now)).toBe('角色_20260102030405.xlsx')
  })

  it('可以是别的后缀（下载导入模板时也用得上）', () => {
    const now = new Date(2026, 5, 1, 0, 0, 0)
    expect(buildExportFilename('用户导入模板', 'xlsx', now)).toBe('用户导入模板_20260601000000.xlsx')
  })

  it('资源名为空时用「导出」兜底，不生成 _2026...xlsx 这种文件名', () => {
    const now = new Date(2026, 5, 1, 0, 0, 0)
    expect(buildExportFilename('   ', 'xlsx', now)).toBe('导出_20260601000000.xlsx')
  })

  it('同一秒内两次导出的文件名一致（时间戳精度到秒）', () => {
    const now = new Date(2026, 1, 13, 15, 30, 45)
    expect(buildExportFilename('用户', 'xlsx', now)).toBe(buildExportFilename('用户', 'xlsx', now))
  })
})

describe('saveBlobAsFile', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // jsdom 不实现 objectURL，这里补上
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  it('创建带 download 属性的链接并点击它', () => {
    const blob = new Blob(['x'], { type: 'application/vnd.ms-excel' })
    saveBlobAsFile(blob, '用户_20260213153045.xlsx')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('把文件名写到 download 属性上', () => {
    let captured: { download: string; href: string } | null = null
    clickSpy.mockImplementation(function (this: HTMLAnchorElement) {
      captured = { download: this.download, href: this.href }
    })

    saveBlobAsFile(new Blob(['x']), '角色_20260213153045.xlsx')

    expect(captured).not.toBeNull()
    expect(captured!.download).toBe('角色_20260213153045.xlsx')
    expect(captured!.href).toBe('blob:mock-url')
  })

  it('点完把临时链接从 DOM 里摘掉，不留垃圾节点', () => {
    saveBlobAsFile(new Blob(['x']), 'a.xlsx')
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  it('延后释放 objectURL（立刻 revoke 会让 Firefox 拿不到内容）', async () => {
    saveBlobAsFile(new Blob(['x']), 'a.xlsx')

    // 同步阶段还没释放
    expect(revokeObjectURL).not.toHaveBeenCalled()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
