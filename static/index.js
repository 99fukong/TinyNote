    // 定义拉取函数
    function pullFromJianguoyun() {
        // 发送拉取请求
        fetch('/pull_from_jianguoyun')
            .then(response => response.json())
            .then(data => {
                alert(data.message); // 显示服务器响应的消息
                location.reload(); // 刷新当前页面
            })
            .catch(error => {
                console.error('Error:', error);
                alert('拉取过程中出现错误');
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        // 添加事件委托，处理按钮点击事件
        document.addEventListener('click', function (event) {
            // 如果点击的是类名为 pull-button 的按钮，则调用拉取函数
            if (event.target.classList.contains('pull-button')) {
                pullFromJianguoyun();
            }
        });
    });

    // 从本地存储获取令牌
    const token = localStorage.getItem('jwtToken');

    // 将URL替换为超链接的函数
    function replaceURLsWithLinks(pre_element) {
        let content = pre_element.innerHTML;
        let urlRegex = /(?<=^|\s)(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, function (url) {
            return '<a href="' + url + '">' + url + '</a>';
        });
    }

    // 获取日记列表元素
    const diaryList = document.getElementById('diary-list');

    // 定义复制文本函数
    function copyText(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                console.log('Text copied successfully');
                alert('内容已复制到剪贴板');
            })
            .catch(err => {
                console.error('Error copying text: ', err);
                alert('复制内容时出错');
            });
    }

    // 从服务器获取日记
    fetch('/get_diaries', {
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    })
    .then(response => {
        if (response.status === 401) {
            console.error(response)
            // 如果未授权，重定向到登录页面
            window.location.href = '/login.html';
        }
        return response.json();
    })
    .then(diaries => {
        // 遍历日记列表
        diaries.forEach(diary => {
            
            var content = diary.content;

            // 创建 LogContent-list 元素
            var LogDiv = document.createElement('div');
            LogDiv.classList.add('LogDiv');
                  
            //创建 LogContent 元素
            // var LogContent = document.createElement('div');
            // LogContent.classList.add('LogContent');
            
            // processLogEntryText2(content);
            
            // // LogContent.textContent = content;

            var LogContent = document.createElement('div');
            LogContent.classList.add('LogContent');
            var logText = content;
            processLogEntryText2(logText);


            function copyIconSvgButtonListener(button) {
                let buttonDom = button; // button 已经是原生 DOM 元素
                let clipboard = new ClipboardJS(buttonDom, {
                    text: function(trigger) {
                        // trigger DOM 元素
                        var codeContainer = trigger.closest('.code-container');
                        var code = codeContainer.querySelector('pre').textContent;
                        return removeMinimumIndentation(code);
                    }
                });
            
                // 处理复制成功事件（可选）
                clipboard.on('success', function(e) {
                    console.log('复制成功');
                    showNotification('Copy Success!', 700);
                    e.clearSelection();
                });
            
                // 处理复制失败事件（可选）
                clipboard.on('error', function(e) {
                    console.error('复制失败：', e.action);
                });
            }
 

            function removeMinimumIndentation(text) {
                // 将文本分割成行数组
                const lines = text.split('\n');
            
                // 初始化最小缩进量为一个较大的值
                let minIndentation = Infinity;
            
                // 遍历每一行，找到最小缩进量，但不处理空行
                for (const line of lines) {
                    if (line.trim() === '') {
                        continue;
                    }
            
                    let indentation = 0;
                    while (line[indentation] === ' ') {
                        indentation++;
                    }
            
                    if (indentation < minIndentation) {
                        minIndentation = indentation;
                    }
                }
            
                // 如果所有行都是空行或没有缩进，设置最小缩进为0
                if (minIndentation === Infinity) {
                    minIndentation = 0;
                }
            
                // 去除每行的最小缩进量空格，并忽略完全是空格的行
                const result = lines.map(line => {
                    if (line.trim() === '') {
                        return line;
                    } else {
                        return line.slice(minIndentation);
                    }
                }).join('\n');
            
                return result;
            }
              
            function addCodeBlockCopyListener(LogContent) {
                // 获取替换后的代码块元素
                var codeContainers = LogContent.querySelectorAll('.code-container');
              
                // 为每个代码块元素添加点击事件监听器
                codeContainers.forEach(function(codeContainer) {
                  var button = codeContainer.querySelector('.copyIconSvgButton');
                  if (button) {
                    copyIconSvgButtonListener(button);
                  }
                });
              }
              
            //新代码
            function processLogEntryText2(logText) {
                var textString = logText;
                // textString  = replaceTabWithSpace(logText);
                // textString  = logText;
                var Matches = [];
                // const codeBlockLinesPattern = {regex:/[\t\x20]{2,}(?!\\)```([\s\S]*?)```(?:$|[\x20]*\n)(?!\n)/gi, type: 'codeBlockBetweenLines'}
                // const codeBlockLinesPattern = {regex:/(?!\\)```([\s\S]*?)```(?:$|[\x20]*\n)/gi, type: 'codeBlockBetweenLines'}
                // const codeBlockLinesPattern = {regex:/(?:\n|^)```([\s\S]*?)```/gi, type: 'codeBlockBetweenLines'}
                const codeBlockLinesPattern = {regex:/(?:^|\r?\n)```([\s\S]*?)(?:\r?\n?)```(?:\r?\n|$)/gi, type: 'codeBlockBetweenLines'}
                const inlinePattern = {regex:/(?<!``)(`[^`]+`)/g, type: 'inLinecodeBlock'}
                const otherPatterns = [
                    // {regex:/((?<![##])[##]{1}(?![##])[/\w\u4e00-\u9fff]+(?=[\x20\n]|$))/g, type: 'tag'},
                    {regex:/((?<![#])[#]{1}[/\w\u4e00-\u9fff]+(?![#]))/g, type: 'tag'},
                    // {regex:/(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&/=]*))/g, type: 'url'},
                    {regex:/(https?:\/\/(?:[a-zA-Z0-9.-]+|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:\/[-a-zA-Z0-9@:%_\+.~#?&/=]*)?)/g, type: 'url'},
                    // {regex:/(?:\s|\r?\n)*?\$\$([\s\S]*?)\$\$(?:\s|\r?\n)*?/g, type: 'MulLineslatex'},
                    // {regex:/(?:\$|\\\[|\\\()([\s\S]*?)(?:\$|\\\]|\\\))/g, type: 'InLineslatex'},
                ]
                Matches = mulTextMatchPattern(textString, codeBlockLinesPattern, inlinePattern, otherPatterns)


                //LogContent.empty()
                debugger
                LogContent.innerHTML = ''; // 清空当前元素内容
                Matches.forEach(match => {
                    let element;
                    debugger
                    switch (match.type) {
                    case 'text':
                        element = document.createElement('span');
                        element.textContent = match.content;
                        break;
                    case 'codeBlockBetweenLines':
                        element = createCodeBlockBetweenLinesElement(match.content)
                        debugger
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
                    // case 'MulLineslatex':
                    //     element = createMulLineslatexElement(match.content)
                    //     break;
                    // case 'InLineslatex':
                    //     element = createInLineslatexElement(match.content)
                    //     break;            
                    }
                    LogContent.appendChild(element)//
                });        
                addCodeBlockCopyListener(LogContent)
            }


            //匹配函数, 返回匹配后的数组, 按原来的顺序
            function textMatchPattern(input, Pattern, PatternType) {
                let match;
                let Matches = [];
                let lastIndex = 0; // 用于跟踪上一个匹配项的结束位置

                // 搜集所有行间代码块及其位置
                while ((match = Pattern.exec(input)) !== null) {
                    // 检查并添加前一个代码块后和当前代码块前的非代码块文本
                    if (match.index > lastIndex) {
                        Matches.push({
                            type: 'text',
                            content: input.substring(lastIndex, match.index),
                        });
                    }

                    Matches.push({
                        type: PatternType,
                        content: match[1],
                    });

                    // 更新lastIndex为当前代码块的结束位置
                    lastIndex = match.index + match[0].length;
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

            // //用于将给定字符串中的制表符 (\t) 替换为两个空格。
            // function replaceTabWithSpace(logText) {
                
            //     // 定义匹配\t的正则表达式
            //     var tabRegex = /\t{1,}/g;
            
            //     logText = logText.replace(tabRegex, function(match) {
            //         // // 使用空格替换
            //         return '  '.repeat(match.length);
            
            //     });    
            
            //     // 设置<log_entry>元素的HTML内容为替换后的内容
            //     // log_entry.html(htmlString);
            //     return logText
            // }

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

            function createCodeBlockBetweenLinesElement(content) {
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
                    'javascript': 'JavaScript',
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
                    'json':'Json'
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
                // const regex = /^(?:\s*)([\S]+)([\s\S]*)/;
                // const regex = /^([\S]+)(?:\r?\n)([\s\S]*)/;
                const regex = /^([\S]*)(?:\r?\n)([\s\S]*)/;
                const matches = content.match(regex);
                let language = '';
                let code = '';
                if (matches) {
                    language = matches[1];
                    code = matches[2];
                }
                let lowerCaseLanguage = language.toLowerCase();
                let languageName = languageMap[lowerCaseLanguage];
            
                if (languageName) {
                    codeTag.textContent = languageName;
                } else {
                    code = content;
                    codeTag.textContent = 'Code';
                }
            
                // 移除代码段开头和结尾的换行符, 不可以/^\s*/, 要保留前缀格式
                code = code.replace(/^(\r?\n)*/, '').trimEnd();
            
                // 使用<div>标签包裹复制图标和<pre>标签
                var container = document.createElement('div');
                container.classList.add('code-container');
                container.appendChild(copyIcon);
            
                var pre = document.createElement('pre');
                pre.textContent = code;
                container.appendChild(pre);
            
                return container;
            }


            function createInLinecodeBlockElement(content){
                // let Element = $(`<span class="singleLineCode">${content}</span>`);
                // 创建一个空的span元素
                let element = document.createElement('span');
                // 添加类名
                element.className = 'singleLineCode';
                // 使用textContent属性安全地添加内容
                element.textContent = content;
                
                // 如果你使用jQuery并希望返回一个jQuery对象
                // return $(element);

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
                
                // 如果你使用jQuery并希望返回一个jQuery对象
                // return $(element);

                // 如果直接使用原生DOM操作，返回原生DOM元素
                return element;    
            }

            function createTagElement(content){
                // 去除尾部空格并保存
                let trimmedStr = content.trimEnd();
                let endWhitespace = content.slice(trimmedStr.length);

                // 创建一个空的span元素
                let spanElement = document.createElement('span');
                // 添加类名
                spanElement.className = 'tag';
                // 使用textContent属性安全地设置文本内容
                spanElement.textContent = trimmedStr;

                // 如果你使用jQuery并希望返回一个jQuery对象
                // let $spanElement = $(spanElement);

                // 处理尾随空格。由于尾随空格是纯文本，我们可以安全地添加。
                // if (endWhitespace.length > 0) {
                //     // 创建一个文本节点来表示尾随空格，并将其添加到span元素之后
                //     $spanElement.after(document.createTextNode(endWhitespace));
                // }

                // 返回jQuery对象
                // return $spanElement;   
                return spanElement;
            }

            function createMulLineslatexElement(content){
                // 将 HTML 字符串解析为文本, 并去除前后空白字符
                let equation = content.trim(); 
                let latexBlock = document.createElement('div');
                // 添加类名
                latexBlock.className = 'BlocklatexMath';
                // latexBlock.classList.add('BlocklatexMath'); 
                // 设置为块级公式
                katex.render(equation, latexBlock, { displayMode: true }); 
                return latexBlock
            }

            // function createInLineslatexElement(content){
            //     // 将 HTML 字符串解析为文本, 并去除前后空白字符
            //     let equation = content.trim(); 
            //     let span = document.createElement('span');
            //     // 不需要为 span 元素添加 data-latex 属性以存储原始的 LaTeX 代码, 
            //     // 否则 LogContent.html() 再次又包含了 latex 源码, 再次解析会乱码

            //     // span.setAttribute('data-latex', match); 
            //     // span.classList.add('latexMath'); // 添加类名
            //     // try{ katex.render(equation, span);} catch(e){return match}
            //     // return span  
            //     span.className = 'latexMath';
            //     try {
            //         katex.render(equation, span);
            //     } catch (e) {
            //         console.error('Error rendering LaTeX', e);
            //     }
            //     return span;
            // }

            //用超链接替换 ​​URL
            replaceURLsWithLinks(LogContent);
            // 更新 LogContent 的内容
            // LogContent.innerHTML = updatedContent;

            // 添加事件监听器以复制代码块内容
            let codeBlockDivs = LogContent.querySelectorAll('.code-block-container');
            // 
            
            codeBlockDivs.forEach(codeBlockDiv => {
                let SvgButton = codeBlockDiv.querySelector('.copy-button')
                let codeBlockSpan = codeBlockDiv.querySelector('.code-block');
                if (SvgButton){
                    SvgButton.addEventListener('click', function(event) {
                        navigator.clipboard.writeText(codeBlockSpan.textContent).then(() => {
                            alert('代码已复制到剪贴板');
                        }).catch(err => {
                            console.error('复制失败', err);
                        });
                    });
                }
            });            
            

            // 创建三个点图标
            const ellipsisIcon = document.createElement('span');
            // ellipsisIcon.innerHTML = '&#8942;';
            ellipsisIcon.innerHTML = '&hellip;';
            ellipsisIcon.classList.add('ellipsis-icon');

            //创建悬浮窗口
            const popup = document.createElement('div');
            popup.classList.add('popup');

            // 创建 pop 元素
            const pop = document.createElement('div');
            pop.classList.add('pop');


            // 创建编辑按钮
            const editButton = document.createElement('button');
            editButton.textContent = '编辑';
            editButton.onclick = () => {
                // 点击编辑按钮跳转到编辑页面
                window.location.href = `/edit/${diary.id}`;
                popup.style.display = 'none'; // 添加这行代码来隐藏悬浮窗
            };
            popup.appendChild(editButton);


            // 创建复制按钮
            const copyButton = document.createElement('button');
            copyButton.textContent = '复制';
            copyButton.onclick = () => {
                // 将日记内容复制到剪贴板
                navigator.clipboard.writeText(content)
                popup.style.display = 'none'; // 添加这行代码来隐藏悬浮窗
            };
            popup.appendChild(copyButton);

            // 创建删除按钮
            const delButton = document.createElement('button');
            delButton.textContent = '删除';
            delButton.onclick = () => {
                // 弹出确认对话框
                if (confirm("确定要删除这篇日记吗？")) {
                    // 发送删除日记的请求
                    fetch(`/delete/${diary.id}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    .then(() => {
                        // 从页面中删除日记
                        diaryList.removeChild(LogDiv);
                    })
                    .catch(error => console.error('删除失败：', error));
                }
                popup.style.display = 'none'; // 添加这行代码来隐藏悬浮窗
            };
            popup.appendChild(delButton);



            // 将 popup 添加到 pop 中
            pop.appendChild(popup);
            // 将 LogContent 和 ellipsisIcon 添加到 LogDiv 中
            LogDiv.appendChild(LogContent);
            
            pop.appendChild(ellipsisIcon);

            // 将 pop 添加到 LogDiv 中
            LogDiv.appendChild(pop);

            // 将 LogDiv 添加到 diaryList 中
            diaryList.appendChild(LogDiv);

            
            // 当鼠标悬停在三个点图标上时显示悬浮窗
            ellipsisIcon.addEventListener('mouseenter', function(event) {
                popup.style.display = 'block'; // 显示悬浮窗
            });

            // 当鼠标移开三个点图标时隐藏悬浮窗
            ellipsisIcon.addEventListener('mouseleave', function(event) {
                // 延时隐藏悬浮窗，给用户时间从图标移到悬浮窗上
                hidePopupTimeout = setTimeout(() => {
                    if (!popup.contains(document.activeElement)) { // 检查悬浮窗内部是否有获得焦点的元素
                        popup.style.display = 'none';
                        // popup.style.display = 'block'; 

                    }
                }, 300); // 延时300毫秒，可根据需要调整
            });

            // 当鼠标进入悬浮窗时取消隐藏悬浮窗的延时
            popup.addEventListener('mouseenter', function(event) {
                clearTimeout(hidePopupTimeout);
            });

            // 当鼠标离开悬浮窗时重新设置隐藏悬浮窗的延时
            popup.addEventListener('mouseleave', function(event) {
                hidePopupTimeout = setTimeout(() => {
                    popup.style.display = 'none';
                    // popup.style.display = 'block';
                }, 300); // 延时300毫秒，可根据需要调整
            });


        });
    })
    .catch(error => console.error('Error:', error));



    // 获取当前日期和时间
    const dateObj = new Date();
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString();

    // 提交日记表单
    const form = document.getElementById('diary-form');
    const contentInput = document.getElementById('diary-content');
    form.addEventListener('submit', event => {
        event.preventDefault();

        const content_old = contentInput.value;
        const content = `## ${dateStr} ${timeStr}:\n` + content_old;
        contentInput.value = '';

        // 发送日记内容到后台
        fetch('/submit_diary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({content:content})
        })
        .then(response => response.json())
        .then(result => {
            if (result.refresh) {
                location.reload();
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // 注销功能
    document.getElementById("clearCookieBtn").addEventListener("click", function() {
        if (confirm("是否注销")) {
            // 发送POST请求到后端接口清除Cookie
            fetch('/clear_cookie', {
                method: 'POST',
                credentials: 'same-origin',
            })
            .then(response => {
                if (response.ok) {
                    console.log("Cookie cleared successfully");// 输出清除成功的消息到控制台
                    window.location.reload(); 
                } else {
                    console.error("Failed to clear cookie");// 输出清除失败的消息到控制台
                }
            })
            .catch(error => {
                console.error("Error while clearing cookie:", error);// 输出错误信息到控制台
            });
        } else {
            console.log("取消注销");
        }
    });

    // 监听页面关闭事件，提示用户保存日记内容
    const diaryContent = document.getElementById('diary-content');
    window.addEventListener('beforeunload', function (e) {
        if (diaryContent.value.trim() !== '') {
            e.preventDefault();
            e.returnValue = '';
            return '您的日记内容尚未保存，确定要离开吗？';
        }
    });