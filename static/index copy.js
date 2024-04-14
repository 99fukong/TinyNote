// 页面加载完成后执行的代码
document.addEventListener('DOMContentLoaded', function () {
// 获取token
token = localStorage.getItem('jwtToken');

// 函数用于在 <pre> 元素中将URL替换为超链接
function replaceURLsWithLinks(pre_element) {
    // <pre> 元素的 HTML 内容
    let content = pre_element.innerHTML;
    // 正则表达式用于查找文本中的URL
    let urlRegex = /(?<=^|\s)(https?:\/\/[^\s]+)/g;
    // 将URL替换为超链接
    content = content.replace(urlRegex, function (url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
    // 使用替换后的内容设置 <pre> 元素的HTML内容
    // pre_element.textContent = content;
    pre_element.innerHTML = content;
}

// 获取 diary-list 元素
const diaryList = document.getElementById('diary-list');

fetch('/get_diaries',{
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    })
    .then(response => {
        if (response.status === 401) {
            console.error(response)
            // 根据需要重定向到登录页面或处理未经授权的访问
            window.location.href = '/login.html'; // 将“/login”替换为实际的登录页面 URL
        }
        return response.json();
    })
    .then(diaries => {
        // 在页面上显示日记列表
        const diaryList = document.getElementById('diary-list'); //获取 ID 为 diary-list 的元素节点对象，并将它赋值给变量 diaryList
        diaries.forEach(diary => { //.forEach() 方法遍历 diaries 数组中的每个日记对象  //diaries 是一个数组
            const content = diary.content;
            const index = diary.lineNumber;
            //console.log(index)
            const pre = document.createElement('pre');
            pre.textContent = content;
            //用超链接替换 ​​URL
            replaceURLsWithLinks(pre);
            // const pre = document.createElement('pre');
            // pre.textContent = content;

            
        // 创建悬浮窗口

        const popup = document.createElement('div');
        popup.classList.add('popup');
        // pre.appendChild(popup);

            
        // 创建编辑按钮
        const editButton = document.createElement('button');
        editButton.textContent = '编辑'; 
        editButton.style.borderRadius = '5px'; // 使用 5px 的圆角，可以根据需要调整值
        //editButton.style.marginRight = '10px'; //右外边距设置为 10 像素
        editButton.onclick = () => {
            // 跳转到编辑页面，传递日记的ID或其他标识符
            window.location.href = `/edit/${diary.id}`;
        };
        popup.appendChild(editButton);

        //创建复制按钮

        const copyButton = document.createElement('button');
        copyButton.textContent = '复制';
        copyButton.style.borderRadius = '5px';
        //copyButton.style.marginRight = '10px';
        copyButton.onclick = () => {
            // 将日记内容复制到剪贴板
            navigator.clipboard.writeText(content)
        };
        popup.appendChild(copyButton);


        // 创建删除按钮
        const delButton = document.createElement('button');
        delButton.textContent = '删除';
        delButton.style.borderRadius = '5px';
        
        delButton.onclick = () => {
            // 弹出确认对话框
            if (confirm("确定要删除这篇日记吗？")) {
                // 用户点击确认后执行删除操作
                fetch(`/delete/${diary.id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(() => {
                    // 从页面上删除该日记
                    diaryList.removeChild(pre);
                    // alert('删除成功！');
                    // location.reload();
                })
                .catch(error => console.error('删除失败：', error));
            }
        };
        popup.appendChild(delButton);


            // // 创建容器元素
            // const buttonContainer = document.createElement('div');
            // buttonContainer.classList.add('button-container'); // 可以添加样式类以方便样式设置

            // // 将编辑按钮添加到容器
            // buttonContainer.appendChild(editButton);
            // // 将删除按钮添加到容器
            // buttonContainer.appendChild(delButton);
            // // 将复制按钮添加到容器
            // buttonContainer.appendChild(copyButton);
            
        // 创建三个点图标
        const ellipsisIcon = document.createElement('span');
        ellipsisIcon.innerHTML = '&#8942;';
        ellipsisIcon.classList.add('ellipsis-icon');
        ellipsisIcon.style.position = 'absolute';
        ellipsisIcon.style.right = '5px';
        ellipsisIcon.style.top = '5px';
        ellipsisIcon.style.cursor = 'pointer';
        // 添加按钮容器和悬浮窗口到日记元素
        pre.appendChild(ellipsisIcon);

        // 点击 ellipsisIcon 显示或隐藏 popup
        ellipsisIcon.addEventListener('click', function(event) {
            event.stopPropagation(); // 阻止事件冒泡
            // 切换 popup 的显示状态
            popup.style.display = (popup.style.display === 'block') ? 'none' : 'block';
            if (popup.style.display === 'block') {
                const rect = ellipsisIcon.getBoundingClientRect();
                popup.style.position = 'absolute';
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + window.scrollY}px`; // 加上滚动偏移
                document.body.appendChild(popup); // 将 popup 添加到 body
            }
        });
        
        // 点击除 ellipsisIcon 以外的地方隐藏 popup
        document.addEventListener('click', function(event) {
            const isClickInsidePopup = popup.contains(event.target);
            const isClickOnIcon = ellipsisIcon.contains(event.target);

            if (!isClickInsidePopup && !isClickOnIcon) {
                popup.style.display = 'none';
            }
        });
        
        // 将容器添加到日记的 <pre> 元素中
        // pre.appendChild(buttonContainer);
        diaryList.appendChild(pre);
    });
})
.catch(error => console.error('Error:', error));

// 监听窗口大小变化事件
window.addEventListener('resize', function () {
    // 获取触发器（这里假设为 ellipsisIcon）
    const ellipsisIcon = document.querySelector('.ellipsis-icon');
    // 获取悬浮窗口
    const popup = ellipsisIcon.parentElement.querySelector('.popup');
    // 如果悬浮窗口可见，则更新其位置
    if (popup.style.display === 'block') {
        const rect = ellipsisIcon.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + window.scrollY}px`; // 加上滚动偏移
    }
});    

const dateObj = new Date(); // new Date() 创建一个新的 Date 对象时，它会自动根据当前系统的日期和时间信息，初始化一个包含各种日期和时间属性的对象。
const dateStr = dateObj.toLocaleDateString(); // 获取当前日期字符串
const timeStr = dateObj.toLocaleTimeString(); // 获取当前时间字符串

// 提交日记表单
const form = document.getElementById('diary-form'); // document.getElementById()  方法获取了 ID 为 diary-form 的表单元素节点：
const contentInput = document.getElementById('diary-content');
form.addEventListener('submit', event => { //使用 .addEventListener() 方法，在该表单元素上注册一个 submit 事件监听器。这个监听器会在表单提交时被触发，并执行指定的回调函数。
    event.preventDefault(); //不刷新

    const content_old = contentInput.value; //获取文本框中的值。
    const content = `## ${dateStr} ${timeStr}:\n` + content_old; //日期+时间 换行 +输入内容。
    //清空表单
    contentInput.value = ''; // 清空文本框内容


    //console.log(content)
    //console.log(JSON.stringify({content}));

    // 发送日记内容到后台
    fetch('/submit_diary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({content:content}) // 请求体 将一个对象 {content: content} 转换为 JSON 格式的字符串。
    })
    .then(response => response.json())
    .then(result => {
        if (result.refresh) {
            // 刷新页面
            location.reload();
        }
    })
    .catch(error => console.error('Error:', error));
    });

//注销功能
document.getElementById("clearCookieBtn").addEventListener("click", function() {
    // 显示确认弹窗
    if (confirm("是否注销")) {
        // 发送POST请求到后端接口清除Cookie
        fetch('/clear_cookie', {
        method: 'POST',
        credentials: 'same-origin',  // 发送跨域请求时携带cookie
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

    // 获取 diary-content 文本框元素
    const diaryContent = document.getElementById('diary-content');

    // 监听页面关闭事件
    window.addEventListener('beforeunload', function (e) {
        // 检查文本框中是否有内容
        if (diaryContent.value.trim() !== '') {
            // 弹出确认提示框
            e.preventDefault();
            e.returnValue = ''; // 兼容旧版浏览器
            return '您的日记内容尚未保存，确定要离开吗？'; // 兼容现代浏览器
        }
    });

});
