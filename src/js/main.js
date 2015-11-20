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

var renderMainTemplate = doT.template(mainTemplate);

function processConversation(conversation, i) {
    conversation.bodyHTML = conversation.body
        .replace(/\s*([\r\n]+\s)+/g, '\n')
        .split('\n')
        .map(p => `<p>${p}</p>`)
        .join('');
    conversation.id = `cnv-${i}`;
    return conversation;
}

function load(el, data) {
    data.conversations = data.conversations.map(processConversation);
    el.innerHTML = renderMainTemplate(data);

    bean.on(el, 'click', '.interactive-share', evt => {
        let network = evt.currentTarget.getAttribute('data-network');
        let i = evt.currentTarget.getAttribute('data-index');
        let shareText = data.conversations[i].shareText || data.shareText;
        let shareUrl = data.conversations[i].shareUrl || data.shareUrl;
        let hashTag = data.conversations[i].hashtag || data.hashtag;
        share(shareText, shareUrl, hashTag)(network);
    })

    let els = {
        top: el.querySelector('#cnv-top'),
        head: el.querySelector('.cnv-head'),
        menu: el.querySelector('.cnv-fixed-menu'),
        menuDown: el.querySelector('.cnv-fixed-menu__arrow--down'),
        menuUp: el.querySelector('.cnv-fixed-menu__arrow--up'),
        menuTitle: el.querySelector('.cnv-fixed-menu__title'),
        convos: [].slice.call(el.querySelectorAll('.cnv-conversation')).reverse()
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
    let throttledSetMenuTitle = throttle(setMenuTitle, 150, {leading: false, trailing: true});

    window.addEventListener('scroll', evt => {
        let menuShouldBeVisible = els.top.getBoundingClientRect().bottom <= 48;
        if (menuShouldBeVisible) {
            throttledSetMenuTitle()
            if (!menuVisible) showMenu();
        } else if (menuVisible) hideMenu();
        menuVisible = menuShouldBeVisible;
    })

    function articleNav(index) {
        let {top} = document.querySelector(`#cnv-${index}`).getBoundingClientRect();
        scrollTop(scrollTop() + top - 48);
        setMenuTitle();
    }

    bean.on(els.menuDown, 'click', evt => articleNav(lastIndex+1))
    bean.on(els.menuUp, 'click', evt => articleNav(lastIndex-1))
    bean.on(els.head, 'click', '.cnv-head__conversation', evt => {
        let convoIndex = Number(evt.currentTarget.getAttribute('data-convo-index'));
        articleNav(convoIndex);
        evt.preventDefault(); evt.stopPropagation();
    })

    window.setTimeout(() => els.head.className = 'cnv-head cnv-head--animate', 50);
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
