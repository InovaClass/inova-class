// A refresh can unmount the control that had the focus (e.g. the row of an open dialog), and the
// browser drops the focus to the body, so the next Tab would start over from the top of the page
export const restoreLostFocus = (previous: Element | null) => {
  if (!previous || previous.isConnected) return
  if (document.activeElement && document.activeElement !== document.body) {
    return
  }
  const heading = document.querySelector<HTMLElement>('main h1')
  if (!heading) return
  heading.tabIndex = -1
  heading.focus()
}
