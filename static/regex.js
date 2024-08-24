import {addCodeBlockCopyListener} from '/static/codeCopy.js'
//新代码
function processLogEntryText2(log_entry) {
    // var textString = logText;
    var textString = log_entry.textContent;
    var Matches = [];
    const codeBlockLinesPattern = {regex:/(?!\\)(```[\s\S]*?```)(?:$|[\x20]*\r?\n)/gi, type: 'codeBlockBetweenLines'}
    const inlinePattern = {regex:/(?:^|[^`])(`[^`]+`)/g, type: 'inLinecodeBlock'}

    const otherPatterns = [
        {regex:/(?:^|\x20)([#＃](?:[/\w\u4e00-\u9fff]+))(?=[\x20\n]|$)/g, type: 'tag'},
        {regex:/(https?:\/\/(?:[a-zA-Z0-9.-]+|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:\/[-a-zA-Z0-9@:%_\+.~#?&/=]*)?)/g, type: 'url'},
        {regex:/(?:[\x20]*\r?\n?|\r?\n[\x20]*)(\$\$[\s\S]*?\$\$)(?:$|[\x20]*\r?\n?)/g, type: 'MulLineslatex'},
        {regex:/((\$|\\\[|\\\()[\s\S]*?(\$|\\\]|\\\)))/g, type: 'InLineslatex'},
    ]    
    Matches = mulTextMatchPattern(textString, codeBlockLinesPattern, inlinePattern, otherPatterns)

    //log_entry.empty()
    log_entry.innerHTML = ''; // 清空当前元素内容
    Matches.forEach(match => {
        let element;
        switch (match.type) {
        case 'text':
            element = document.createElement('span');
            element.textContent = match.content;
            break;
        case 'codeBlockBetweenLines':
            element = createCodeBlockBetweenLinesElement(match.content)
            break;
        case 'inLinecodeBlock':
            element = createInLinecodeBlockElement(match.content)
                        
            break;
        case 'tag':
            element = createTagElement(match.content)
            break;
        case 'url':
            element = createUrlElement(match.content)
            break;
        case 'MulLineslatex':
            element = createMulLineslatexElement(match.content)
            break;
        case 'InLineslatex':
            element = createInLineslatexElement(match.content)
            break;            
        }
        log_entry.appendChild(element)//
    });        
    addCodeBlockCopyListener(log_entry)
}

// Pattern 必须保证有一个分组
function textMatchPattern(input, Pattern, PatternType) {
    let match;
    let Matches = [];
    let lastIndex = 0; // 用于跟踪上一个匹配项的结束位置

    // 搜集所有行间代码块及其位置
    while ((match = Pattern.exec(input)) !== null) {
        // 检查并添加前一个代码块后和当前代码块前的非代码块文本
        let fullMatchIndex = match.index; // 总匹配的起始位置
        let firstGroupIndex = fullMatchIndex + match[0].indexOf(match[1]); // 第一个分组的起始位置
        if (firstGroupIndex > lastIndex) {
            Matches.push({
                type: 'text',
                content: input.substring(lastIndex, firstGroupIndex),
            });
        }

        Matches.push({
            type: PatternType,
            content: match[1],
        });

        // 更新lastIndex为当前代码块的结束位置
        lastIndex = firstGroupIndex + match[1].length;
    }

    // 检查最后一个代码块后是否还有文本
    if (lastIndex < input.length) {
        Matches.push({
            type: 'text',
            content: input.substring(lastIndex),
        });
    }
    return Matches;
}


function subTextMatchPattern(Matches, Pattern, PatternType){
    let tempMatches = [...Matches];
    for(let i = 0, addItems = 0; i < tempMatches.length; i++){
        let item  = tempMatches[i];
        if (item.type == 'text'){
            let PatternMatches = textMatchPattern(item.content, Pattern, PatternType);
            Matches.splice(i + addItems, 1, ...PatternMatches)
            addItems = addItems + PatternMatches.length - 1
        }
    }
}


function mulTextMatchPattern(input, codeBlockLinesPattern, inlinePattern, otherPatterns){
    let Matches = textMatchPattern(input, codeBlockLinesPattern.regex, codeBlockLinesPattern.type);
    subTextMatchPattern(Matches, inlinePattern.regex, inlinePattern.type)
    otherPatterns.forEach(element => {
        subTextMatchPattern(Matches, element.regex, element.type)
    }); 
    return Matches
}

function createCodeBlockBetweenLinesElement(content){
    // 定义语言映射表
    const languageMap = {
        'python': 'Python',
        'c': 'C',
        'make': 'Makefile',
        'cmd': 'CMD',
        'sql': 'SQL',
        'db': 'Database',
        'mongodb': 'MongoDB',
        'c#': 'C#',
        'c++': 'C++',
        'cpp': 'cpp',
        'objective-c': 'Objective-C',
        'objective-c++': 'Objective-C++',
        'js': 'JavaScript',
        'tx': 'TypeScript',
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'css': 'CSS',
        'html': 'HTML',
        'php': 'PHP',
        'go': 'Go',
        'ruby': 'Ruby',
        'rust': 'Rust',
        'java': 'Java',
        'shell': 'Shell',
        'sh': 'Shell',
        'code': 'Code',
        'py': 'Python',
        'regex':'regex',
        'json':'Json',
        'bash': 'Bash',
        'dockerfile': 'Dockerfile',
        'powershell': 'PowerShell',
        'ps': 'PowerShell',
        'zsh': 'Zsh',
        'cmd': 'CMD',
        'git': 'Git',
        'mojo': 'Mojo',
    };

    // 创建包含 copyIcon 的 div 元素
    var copyIcon = document.createElement('div');
    copyIcon.classList.add('copyIcon');
                
    // 创建包含 Code 的 span 元素
    var codeTag = document.createElement('span');
    codeTag.classList.add('codeTag');
    codeTag.textContent = 'Code';
                
    // 创建 button 元素
    var copyIconSvgButton = document.createElement('button');
    copyIconSvgButton.classList.add('copyIconSvgButton');
                
    // 创建 svg 元素
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.classList.add('lucide', 'lucide-copy', 'w-4', 'h-auto');
    
    // 创建 rect 元素
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '14');
    rect.setAttribute('height', '14');
    rect.setAttribute('x', '8');
    rect.setAttribute('y', '8');
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');
                
    // 创建 path 元素
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2');
                
    // 组装 SVG 元素
    svg.appendChild(rect);
    svg.appendChild(path);
                
    // 将 SVG 添加到按钮
    copyIconSvgButton.appendChild(svg);
                
    // 将 span 和 button 添加到 div
    copyIcon.appendChild(codeTag);
    copyIcon.appendChild(copyIconSvgButton);


    // 使用正则表达式匹配第一个单词
    const regex = /^(?:```)([\S]*)(?:\r?\n)([\s\S]*)(?:```)/;
    const matches = content.match(regex);
    let language = '';
    let code = '';
    if (matches){
        language = matches[1]
        code = matches[2]
    }
    let lowerCaseLanguage = language.toLowerCase();
    let languageName = languageMap[lowerCaseLanguage];

    if (languageName){
        // copyIcon.find('span').text(languageName);
        codeTag.textContent = languageName;
    } else if(language) {
        // use match to replace language with languageName
        codeTag.textContent = 'Code';
    }

    // 移除代码段开头和结尾的换行符, 不可以/^\s*/, 要保留前缀格式
    code = code.replace(/^\n*/, '').trimEnd();
    let Element;
    // 使用<div>标签包裹复制图标和<pre>标签
    // Element = $(`<div class="code-container">${copyIcon.prop('outerHTML')}<pre>${code}</pre></div>`);
    Element = createCodeContainer(code, copyIcon)
    return Element
}

function createCodeContainer(code, copyIcon) {
    // 创建一个<div>元素并设置class属性
    let divElement = document.createElement('div');
    divElement.className = 'code-container';

    // 假设copyIcon已经是一个安全的jQuery对象，我们可以直接将其追加到divElement中
    // 如果copyIcon是一个DOM元素，使用divElement.appendChild(copyIcon.cloneNode(true));
    // $(divElement).append(copyIcon.clone(true));
    divElement.appendChild(copyIcon.cloneNode(true));

    // 创建<pre>元素并安全地设置其文本内容
    let preElement = document.createElement('pre');
    preElement.textContent = code;

    // 将<pre>元素添加到<div>元素中
    divElement.appendChild(preElement);

    // 如果你需要返回一个jQuery对象
    // return $(divElement);

    // 如果你不需要jQuery特性，可以直接返回原生DOM元素
    return divElement;
}

function createInLinecodeBlockElement(content){
    // 创建一个空的span元素
    let element = document.createElement('span');
    // 添加类名
    element.className = 'singleLineCode';
    // 使用textContent属性安全地添加内容
    element.textContent = content;

    // 如果直接使用原生DOM操作，返回原生DOM元素
    return element;
}

function createUrlElement(content){
    // 创建一个空的<a>元素
    let element = document.createElement('a');
    // 设置href属性
    element.href = content;
    // 设置显示的文本
    element.textContent = content;
                
    // 如果直接使用原生DOM操作，返回原生DOM元素
    return element;    
}

function createTagElement(content){ 
    // 创建一个空的span元素
    let spanElement = document.createElement('span');
    // 添加类名
    spanElement.className = 'tag';
    // 使用textContent属性安全地设置文本内容
    spanElement.textContent = trimmedStr;
    // 返回span对象
    return spanElement 
}


function createMulLineslatexElement(content){
    // 将 HTML 字符串解析为文本, 并去除前后空白字符
    let equation = content.trim(); 
    // 去除 前后的 \$\$
    equation = equation.replace(/^\$\$|\$\$$/g, '');
    let latexBlock = document.createElement('div');
    latexBlock.classList.add('BlocklatexMath'); // 添加类名
    // 设置为块级公式
    try { katex.render(equation, latexBlock, { displayMode: true }); } catch (e) { 
        let spanElement = document.createElement('span');
        spanElement.textContent = '$$'+content+'$$'
        return spanElement} 
    return latexBlock
}

function createInLineslatexElement(content){
    // 将 HTML 字符串解析为文本, 并去除前后空白字符
    let equation = content.trim(); 
    // 去除 前后的 标识
    equation = equation.replace(/^(\$|\\\[|\\\()|(\$|\\\]|\\\))$/g, '');
    let span = document.createElement('span');
    // 不需要为 span 元素添加 data-latex 属性以存储原始的 LaTeX 代码, 
    // 否则 log_entry.html() 再次又包含了 latex 源码, 再次解析会乱码
    // span.setAttribute('data-latex', match); 
    span.classList.add('latexMath'); // 添加类名
    try{ katex.render(equation, span);} catch(e){
        let spanElement = document.createElement('span');
        spanElement.textContent = '$'+content+'$'
        return spanElement}
    return span  
}

export {
    processLogEntryText2,
};