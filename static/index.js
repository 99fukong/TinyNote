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

    // document.addEventListener('DOMContentLoaded', function () {
    //     // 添加事件委托，处理按钮点击事件
    //     document.addEventListener('click', function (event) {
    //         if (event.target.classList.contains('pull-button')) {
    //             pullFromJianguoyun();
    //         } else if (event.target.classList.contains('copy-button')) {
    //             // 如果点击的是类名为 copy-button 的按钮，则复制内容
    //             const codeBlockSpan = event.target.parentElement; // 获取父容器中的 codeBlockSpan
    //             const content = codeBlockSpan.textContent; // 获取内容
    //             copyText(content); // 调用复制文本函数
    //         }
    //     });
    // });

    // 从本地存储获取令牌
    const token = localStorage.getItem('jwtToken');

    // 将URL替换为超链接的函数
    function replaceURLsWithLinks(pre_element) {
        let content = pre_element.innerHTML;
        let urlRegex = /(?<=^|\s)(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, function (url) {
            return '<a href="' + url + '">' + url + '</a>';
        });
        // pre_element.innerHTML = content;
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
            LogDiv.classList.add('pre-list');
            
            
            //创建 LogContent 元素
            var LogContent = document.createElement('div');
            LogContent.classList.add('pre');
            LogContent.textContent = content;




            // 代码块
            const codeBlockStart = '```';
            const codeBlockEnd = '```';

            let startIndex = content.indexOf(codeBlockStart);
            let updatedContent = content; // 保存更新后的内容
            // // 定义一个数组来存储所有的按钮引用
            // const copyButtons = [];

            while (startIndex !== -1) {
                // 查找下一个结束标记
                const endIndex = updatedContent.indexOf(codeBlockEnd, startIndex + codeBlockStart.length);
                
                if (endIndex !== -1) {
                    // 检查开始标记和结束标记之间是否包含其他开始标记
                    const innerStartIndex = updatedContent.indexOf(codeBlockStart, startIndex + codeBlockStart.length);
                    
                    // 如果包含其他开始标记并且在结束标记之前，则跳过当前开始标记
                    if (innerStartIndex !== -1 && innerStartIndex < endIndex) {
                        startIndex = updatedContent.indexOf(codeBlockStart, innerStartIndex + codeBlockStart.length);
                        continue;
                    }

                    // 提取代码块内容
                    const codeBlockContent = updatedContent.substring(startIndex + codeBlockStart.length, endIndex)//.trim(); // 使用 .trim() 移除前后的空白符
                    
                    // 创建包含代码块的 div 容器
                    const codeBlockDiv = document.createElement('div');
                    codeBlockDiv.classList.add('code-block-container');

                    // 创建包含代码块的 span 元素
                    const codeBlockSpan = document.createElement('span');
                    codeBlockSpan.textContent = codeBlockContent;
                    codeBlockSpan.classList.add('code-block');

                    // 创建包含 SVG 图标的按钮
                    const svgButton = document.createElement('button');
                    svgButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy w-4 h-auto"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
                    svgButton.classList.add('copy-button');

                    // 添加按钮引用到数组中
                    // copyButtons.push(svgButton);

                    // 将复制按钮添加到代码块容器中
                    codeBlockDiv.appendChild(codeBlockSpan);
                    codeBlockDiv.appendChild(svgButton);
                    LogContent.appendChild(codeBlockDiv);

                    // 替换原始代码块
                    updatedContent = updatedContent.substring(0, startIndex) + codeBlockDiv.outerHTML + updatedContent.substring(endIndex + codeBlockEnd.length);
                    
                    // 更新 startIndex，以便查找下一个代码块的起始位置
                    startIndex = updatedContent.indexOf(codeBlockStart, endIndex + codeBlockEnd.length);
                } else {
                    // 如果没有找到匹配的结束标记，则跳出循环
                    break;
                }
            }

            //用超链接替换 ​​URL
            replaceURLsWithLinks(LogContent);
            // 更新 LogContent 的内容
            LogContent.innerHTML = updatedContent;

            // 添加事件监听器以复制代码块内容
            // function handleButtonClick() {
            //     navigator.clipboard.writeText(codeBlockSpan.textContent).then(() => {
            //         alert('代码已复制到剪贴板');
            //     }).catch(err => {
            //         console.error('复制失败', err);
            //     });
            // }
            

            // let preSvgButtons = LogContent.querySelectorAll('.code-block-container .copy-button');
            // // debugger;
            // if (preSvgButtons.length > 0) {
            //     // 执行你的操作
            //     console.log("成功选择到了按钮");
            // } else {
            //     console.log("未成功选择到按钮");
            // }            
            
            // preSvgButtons.forEach(preSvgButton => {
            //     preSvgButton.addEventListener('click', function(event) {
            //         // debugger;
            //         let codeBlockSpan = preSvgButton.closest('.code-block-container').querySelector('.code-block');
            //         if (codeBlockSpan) {
            //             navigator.clipboard.writeText(codeBlockSpan.textContent).then(() => {
            //                 alert('代码已复制到剪贴板');
            //             }).catch(err => {
            //                 console.error('复制失败', err);
            //             });
            //         }
            //     });
            // });

            let codeBlockDivs = LogContent.querySelectorAll('.code-block-container');
            // debugger;
            if (codeBlockDivs.length > 0) {
                // 执行你的操作
                console.log("成功选择到了代码块");
            } else {
                console.log("未成功选择到代码块");
            }            
            
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
            
            // //用超链接替换 ​​URL
            // replaceURLsWithLinks(LogContent);

            // 创建三个点图标
            const ellipsisIcon = document.createElement('span');
            ellipsisIcon.innerHTML = '&#8942;';
            ellipsisIcon.classList.add('ellipsis-icon');

            //创建悬浮窗口
            const popup = document.createElement('div');
            popup.classList.add('popup');

            // 创建 pop 元素
            const pop = document.createElement('div');
            pop.classList.add('pop');


            // 创建拉取按钮
            // const pullButton = document.createElement('button');
            // pullButton.textContent = '拉取';
            // pullButton.onclick = () => {
            //     // 点击拉取按钮将坚果云的md文档拉取到数据库
            //     fetch('/pull_from_jianguoyun')
            //         .then(response => response.json())
            //         .then(data => {
            //             alert(data.message); // 使用弹窗显示服务器响应的消息
            //             location.reload(); // 刷新当前页面
            //             //popup.style.display = 'none'; // 隐藏悬浮窗
            //         })
            //         .catch(error => {
            //             console.error('Error:', error);
            //             alert('拉取过程中出现错误');
            //         });
            // };
            // popup.appendChild(pullButton);

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