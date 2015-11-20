import domready from 'ded/domready'
import doT from 'olado/doT'
import mainTemplate from '../templates/main.html!text'
import bean from 'fat/bean'
// import bonzo from 'ded/bonzo'
import debounce from './lib/debounce'
import {fetchJSON} from './lib/fetch'
import share from './lib/share'

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
