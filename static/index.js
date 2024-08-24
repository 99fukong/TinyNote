import {processLogEntryText2} from '/static/regex.js';
import {showNotification} from '/static/codeCopy.js'

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
        // let urlRegex = /(?<=^|\s)(https?:\/\/[^\s]+)/g;
        let urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&/=]*)/g;
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

            // 创建 log_entry-list 元素
            var LogDiv = document.createElement('div');
            LogDiv.classList.add('LogDiv');

            var log_entry = document.createElement('div');
            log_entry.classList.add('log_entry');
            log_entry.textContent = content;
            processLogEntryText2(log_entry);

            //用超链接替换 ​​URL
            replaceURLsWithLinks(log_entry);

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

            // 创建复制按钮
            const copyButton = document.createElement('button');
            copyButton.textContent = '复制';
            copyButton.onclick = () => {
                // 将日记内容复制到剪贴板
                navigator.clipboard.writeText(content)
                popup.style.display = 'none'; // 添加这行代码来隐藏悬浮窗
                showNotification('Copy Success!', 700)
            };
            popup.appendChild(copyButton);

            // 创建编辑按钮
            const editButton = document.createElement('button');
            editButton.textContent = '编辑';
            editButton.onclick = () => {
                // 点击编辑按钮跳转到编辑页面
                window.location.href = `/edit/${diary.id}`;
                popup.style.display = 'none'; // 添加这行代码来隐藏悬浮窗
            };
            popup.appendChild(editButton);

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
            // 将 log_entry 和 ellipsisIcon 添加到 LogDiv 中
            LogDiv.appendChild(log_entry);

            pop.appendChild(ellipsisIcon);

            // 将 pop 添加到 LogDiv 中
            LogDiv.appendChild(pop);

            // 将 LogDiv 添加到 diaryList 中
            diaryList.appendChild(LogDiv);


            // 当鼠标悬停在三个点图标上时显示悬浮窗
            ellipsisIcon.addEventListener('mouseenter', function (event) {
                popup.style.display = 'block'; // 显示悬浮窗
            });

            ellipsisIcon.addEventListener('mouseenter', function (event) {
                // clearTimeout(hidePopupTimeout);
                popup.style.display = 'block'; // 显示悬浮窗
            });

            // 当鼠标移开三个点图标时隐藏悬浮窗
            popup.addEventListener('mouseleave', function (event) {
                popup.style.display = 'none'; // 显示悬浮窗
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
        body: JSON.stringify({ content: content })
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
document.getElementById("clearCookieBtn").addEventListener("click", function () {
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