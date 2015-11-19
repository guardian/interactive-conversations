import iframeMessenger from 'guardian/iframe-messenger'

export default function() {
    let resize = debounce(iframeMessenger.resize.bind(iframeMessenger), 200);
    window.addEventListener('resize', evt => resize());
    if (document.readyState !== 'complete') window.addEventListener('load', evt => resize());
    else resize();
}
