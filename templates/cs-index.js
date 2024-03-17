// 获取日记列表
token = localStorage.getItem('jwtToken');

fetch('/get_diaries',{
    headers: {
        'Authorization': token,
    }})                 
    //将字符串，转换为json对象
    .then(response => {
        if (response.status === 401) {
            console.error(response)
            // Redirect to the login page or handle unauthorized access as needed
            window.location.href = '/login.html'; // Replace '/login' with the actual login page URL
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
            // pre.style.border = '2px solid #333'; // 设置边框样式
            // pre.style.padding = '10px'; // 设置内边距
            // pre.style.marginBottom = '10px'; // 设置外边距

            // 创建编辑按钮
            const editButton = document.createElement('button');
            editButton.textContent = '编辑';
            editButton.style.marginLeft = '10px';
            editButton.onclick = () => {
                // 跳转到编辑页面，传递日记的ID或其他标识符
                window.location.href = `/edit/${index}`;
            };
            pre.appendChild(editButton);


            // 创建删除按钮
            const delButton = document.createElement('button');
            delButton.textContent = '删除';
            delButton.style.marginLeft = '10px';
            delButton.onclick = () => {
                // 发送删除请求到后台
                fetch(`/delete/{{ diary.id }}`, { 
                    method: 'POST' , 
                    headers: {
                        'Authorization': token}})
                    .then(() => {
                        // 从页面上删除该日记
                        diaryList.removeChild(pre);
                        alert('删除成功！');
                        location.reload();
                    })
                    .catch(error => console.error('删除失败：', error));
            };
            pre.appendChild(delButton);

            // 创建行号
            const lineNumber = document.createElement('span');
            lineNumber.textContent = `(${index}) `;
            lineNumber.style.color = '#999';
            lineNumber.style.fontSize = '0.8em';
            pre.insertBefore(lineNumber, pre.firstChild);

            diaryList.appendChild(pre);
        });
    });
 
const dateObj = new Date(); // new Date() 创建一个新的 Date 对象时，它会自动根据当前系统的日期和时间信息，初始化一个包含各种日期和时间属性的对象。
const dateStr = dateObj.toLocaleDateString(); // 获取当前日期字符串
const timeStr = dateObj.toLocaleTimeString(); // 获取当前时间字符串
// 提交日记表单
const form = document.getElementById('diary-form'); // document.getElementById()  方法获取了 ID 为 diary-form 的表单元素节点：
form.addEventListener('submit', event => { //使用 .addEventListener() 方法，在该表单元素上注册一个 submit 事件监听器。这个监听器会在表单提交时被触发，并执行指定的回调函数。
    event.preventDefault(); //不刷新

    const content_old = document.getElementById('diary-content').value; //获取文本框中的值。
    const content = `## ${dateStr} ${timeStr}:\n` + content_old; //日期+时间 换行 +输入内容。
    //console.log(content)
    //console.log(JSON.stringify({content}));

    // 发送日记内容到后台
    fetch('/submit_diary', {  // 请求地址
        method: 'POST',  // HTTP 方法
        headers: {
            'Content-Type': 'application/json'// 请求头 表示请求体中的数据类型是 JSON
        },
        body: JSON.stringify({content}) // 请求体 将一个对象 {content: content} 转换为 JSON 格式的字符串。
    })
    .then(response => response.json())
    .then(result => {
        if (result.refresh) {
            // 刷新页面
            location.reload();
        }
    });
});

   
// 监听清除Cookie按钮的点击事件
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

