// 获取 JWT 令牌
const token = localStorage.getItem('jwtToken');

// 获取粘贴板列表
fetch('/get_pastes', {
    headers: {
        'Authorization': token,
    }
})
.then(response => {
    if (response.status === 401) {
        // 处理未授权访问
        window.location.href = '/login.html'; // 确保这里的路径与你的登录页面匹配
    }
    return response.json();
})
.then(pastes => {
    const pasteList = document.getElementById('paste-list');
    pastes.forEach(paste => {
        const content = paste.content;
        const id = paste.id; // 假设每个粘贴板条目都有一个唯一的ID
        const pre = document.createElement('pre');
        pre.textContent = content;

        // 创建编辑按钮
        const editButton = document.createElement('button');
        editButton.textContent = '编辑';
        editButton.onclick = () => {
            window.location.href = `/edit/${id}`; // 确保这个路径与你的编辑页面路由匹配
        };
        pre.appendChild(editButton);

        // 创建删除按钮
        const delButton = document.createElement('button');
        delButton.textContent = '删除';
        delButton.onclick = () => {
            fetch(`/delete_paste/${id}`, { 
                method: 'POST', 
                headers: {
                    'Authorization': token
                }
            })
            .then(response => {
                if (response.ok) {
                    pasteList.removeChild(pre);
                    alert('删除成功！');
                } else {
                    throw new Error('删除失败');
                }
            })
            .catch(error => alert(error.message));
        };
        pre.appendChild(delButton);

        pasteList.appendChild(pre);
    });
});

// 提交粘贴板条目
const form = document.getElementById('paste-form');
form.addEventListener('submit', event => {
    event.preventDefault();

    const content = document.getElementById('paste-content').value;
    const dateTime = new Date().toLocaleString();

    fetch('/submit_paste', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({content: `## ${dateTime}:\n${content}`})
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            window.location.reload();
        } else {
            throw new Error(result.message || '提交失败');
        }
    })
    .catch(error => alert(error.message));
});
