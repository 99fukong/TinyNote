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
  
function addCodeBlockCopyListener(log_entry) {
    // 获取替换后的代码块元素
    var codeContainers = log_entry.querySelectorAll('.code-container');
  
    // 为每个代码块元素添加点击事件监听器
    codeContainers.forEach(function(codeContainer) {
      var button = codeContainer.querySelector('.copyIconSvgButton');
      if (button) {
        copyIconSvgButtonListener(button);
      }
    });
}

function showNotification(message, time) {
    const notification = document.createElement("div");
    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.backgroundColor = "white"; // 背景色改为白色
    notification.style.color = "black";
    notification.style.padding = "10px";
    notification.style.borderRadius = "5px";
    notification.style.zIndex = "1000";
    notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)"; // 可选：添加一些阴影以增加立体感
    notification.style.display = "flex";
    notification.style.alignItems = "center";
  
    // 创建对勾元素
    const checkMark = document.createElement("span");
    checkMark.innerHTML = "&#10004;"; // 对勾符号
    checkMark.style.color = "green"; // 对勾颜色为绿色
    checkMark.style.marginRight = "10px"; // 与文本保持一定距离
  
    // 创建文本元素
    const text = document.createElement("span");
    text.innerText = message;
  
    // 将对勾和文本加入到通知中
    notification.appendChild(checkMark);
    notification.appendChild(text);
  
    document.body.appendChild(notification);
  
    setTimeout(() => {
      document.body.removeChild(notification);
    }, time); // 3秒后自动消失
}

export {
    addCodeBlockCopyListener, 
    showNotification
}