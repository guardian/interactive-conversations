import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import bean from 'fat/bean'
// import bonzo from 'ded/bonzo'
import debounce from './lib/debounce'
import throttle from './lib/throttle'
import {fetchJSON} from './lib/fetch'
import share from './lib/share'
import {scrollTop} from './lib/scroll'
import bowser from 'ded/bowser'

var renderMainTemplate = doT.template(mainTemplate);

function getImgIdAndCrop(url) {
    // example urls:
    // https://media.gutools.co.uk/images/68dade559ee396fefc43225e6bfa40e80d8355e2
    // https://media.guim.co.uk/1000fabd81a0ded0aebe43ecfef4497c83244ec5/0_0_4423_3010/4423.jpg
    let re = /^https?:\/\/media\.(?:guim|gutools)\.co\.uk\/([a-zA-Z0-9]+)\/((\d+)_\d+_(\d+)_\d+)/;
    let match = re.exec(url);
    if (match) {
        return {
            id: match[1],
            crop: match[2],
            width: Number(match[4]) - Number(match[3])
        };
    } else throw Error('Invalid image URL - must be a grid image link');
}

function getImgs(url) {
    let info = getImgIdAndCrop(url);
    return {
        small: `https://media.guim.co.uk/${info.id}/${info.crop}/${Math.min(info.width, 500)}.jpg`,
        large: `https://media.guim.co.uk/${info.id}/${info.crop}/${Math.min(info.width, 1000)}.jpg`
    }
}

function processConversation(conversation, i) {
    conversation.bodyHTML = conversation.body
        .replace(/\s*([\r\n]+\s)+/g, '\n')
        .split('\n')
        .map(p => `<p>${p}</p>`)
        .join('');

    conversation.id = `cnv-${i}`;

    if (conversation.img) conversation.imgs = getImgs(conversation.img);

    return conversation;
}

function load(el, data) {
    let hoverBackgrounds = !bowser.mobile && !bowser.tablet;

    data.conversations = data.conversations.map(processConversation);
    data.hoverBackgrounds = hoverBackgrounds;
    data.bgImgs = getImgs(data.bgImg);
    el.innerHTML = renderMainTemplate(data);

    bean.on(el, 'click', '.interactive-share', evt => {
        let network = evt.currentTarget.getAttribute('data-network');
        let i = evt.currentTarget.getAttribute('data-index');
        let shareText = i && data.conversations[i].shareText || data.shareText;
        let shareUrl = i && data.conversations[i].shareUrl || data.shareUrl;
        let hashTag = i && data.conversations[i].hashtag || data.hashtag;
        let fbImg = i && (data.conversations[i].imgs && data.conversations[i].imgs.large) || data.bgImgs.large;
        let twImg = i && data.conversations[i].twitterImg;
        share(shareText, shareUrl, fbImg, twImg, hashTag)(network);
    })

    let els = {
        top: el.querySelector('#cnv-top'),
        head: el.querySelector('.cnv-head'),
        menu: el.querySelector('.cnv-fixed-menu'),
        menuDown: el.querySelector('.cnv-fixed-menu__arrow--down'),
        menuUp: el.querySelector('.cnv-fixed-menu__arrow--up'),
        menuTitle: el.querySelector('.cnv-fixed-menu__title'),
        convos: [].slice.call(el.querySelectorAll('.cnv-conversation')).reverse(),
        headConvos: [].slice.call(el.querySelectorAll('.cnv-head__conversation')),
        headBackgrounds: [].slice.call(el.querySelectorAll('.cnv-head-background'))
    }
    let menuVisible = false;
    let showMenu = () => els.menu.setAttribute('data-show', '');
    let hideMenu = () => els.menu.removeAttribute('data-show');

    let lastIndex;
    function setMenuTitle() {
        for (var i = 0; i < els.convos.length; i++) {
            let {top} = els.convos[i].getBoundingClientRect();
            if (top < 150) {
                let index = Number(els.convos[i].getAttribute('data-convo-index'));
                if (index !== lastIndex) {
                    if (index === 0) els.menuUp.setAttribute('disabled', '');
                    else els.menuUp.removeAttribute('disabled');

                    if (index === data.conversations.length - 1) els.menuDown.setAttribute('disabled', '')
                    else els.menuDown.removeAttribute('disabled')

                    els.menuTitle.textContent = data.conversations[index].title;
                    lastIndex = index;
                }
                break;
            }
        }
    }

    function articleNav(index) {
        let {top} = document.querySelector(`#cnv-${index}`).getBoundingClientRect();
        document.location.hash = `c${index}`;
        scrollTop(scrollTop() + top - 48);
        setMenuTitle();
    }


    let throttledSetMenuTitle = throttle(setMenuTitle, 150, {leading: false, trailing: true});

    window.addEventListener('scroll', evt => {
        let menuShouldBeVisible = els.top.getBoundingClientRect().bottom <= 48;
        if (menuShouldBeVisible) {
            throttledSetMenuTitle()
            if (!menuVisible) showMenu();
        } else if (menuVisible) hideMenu();
        menuVisible = menuShouldBeVisible;
    })
    bean.on(els.menuDown, 'click', evt => articleNav(lastIndex+1))
    bean.on(els.menuUp, 'click', evt => articleNav(lastIndex-1))
    bean.on(els.head, 'click', '.cnv-head__conversation', evt => {
        let convoIndex = Number(evt.currentTarget.getAttribute('data-convo-index'));
        articleNav(convoIndex);
        evt.preventDefault(); evt.stopPropagation();
    })

    let hideAllBackgrounds = () => els.headBackgrounds.forEach(convoEl => convoEl.className = 'cnv-head-background');

    if (hoverBackgrounds) {
        els.headConvos.forEach((thisConvoEl, i) => {
            bean.on(thisConvoEl, 'mouseenter', evt => {
                if (data.conversations[i].img) {
                    hideAllBackgrounds();
                    els.headBackgrounds[i+1].className = 'cnv-head-background cnv-head-background--show';
                }
            })
            bean.on(thisConvoEl, 'mouseleave', () =>{
                hideAllBackgrounds();
                els.headBackgrounds[0].className = 'cnv-head-background cnv-head-background--show';

            });
        })
    }

    window.setTimeout(() => els.head.className = 'cnv-head cnv-head--animate', 50);

    let match = /^#?c(\d+)$/.exec(document.location.hash);
    if (match) window.setTimeout(() => articleNav(match[1]), 10);
}

export function init(el, context, config) {
    domready(() => {
        fetchJSON('https://interactive.guim.co.uk/docsdata-test/1dHvhZMqkgon1QuFCjChF3rYCsuIue8Bq0Qhjd3yYUaA.json')
            .then(data => {
                load(el, data);
                document.querySelector('.cnv-content--loading').className = 'cnv-content';
            })
    })
}
