export function scrollTop(val) {
	return val === undefined ? window.pageYOffset || document.documentElement.scrollTop : window.scrollTo(0, val);
}
