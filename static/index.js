// 获取token
token = localStorage.getItem('jwtToken');

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


        // 创建编辑按钮
        const editButton = document.createElement('button');
        editButton.textContent = '编辑';
        editButton.style.marginLeft = '10px';
        editButton.onclick = () => {
            // 跳转到编辑页面，传递日记的ID或其他标识符
            window.location.href = `/edit/${diary.id}`;
        };
        pre.appendChild(editButton);


            
        // 创建删除按钮
        const delButton = document.createElement('button');
        delButton.textContent = '删除';
        delButton.style.marginLeft = '10px';
        delButton.onclick = () => {
            // 发送删除请求到后台
            fetch(`/delete/${diary.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(() => {
                    // 从页面上删除该日记
                    diaryList.removeChild(pre);
                    alert('删除成功！');
                        location.reload();
                })
                .catch(error => console.error('删除失败：', error));
            };
            pre.appendChild(delButton);

            

            diaryList.appendChild(pre);
        });
    })
    .catch(error => console.error('Error:', error));

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