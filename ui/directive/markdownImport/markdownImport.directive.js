angular.module('kityminderEditor')
    .directive('markdownImport', function() {
        return {
            restrict: 'E',
            templateUrl: 'ui/directive/markdownImport/markdownImport.html',
            scope: {
                minder: '='
            },
            controller: ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
                $scope.markdownContent = '';
                $scope.modelList = [];
                $scope.selectedModel = '';
                $scope.userMessage = '';
                $scope.chatMessages = [];

                // 获取可用的模型列表
                function fetchModelList() {
                    $http({
                        method: 'GET',
                        url: 'http://localhost:3001/api/models'
                    })
                    .then(function(response) {
                        if (response.data && response.data.models) {
                            $scope.modelList = response.data.models;
                        } else {
                            console.error('获取模型列表失败: 数据格式不正确');
                        }
                    })
                    .catch(function(error) {
                        console.error('获取模型列表失败:', error);
                    });
                }

                // 初始化时获取模型列表
                fetchModelList();

                // 当选择模型变化时
                $scope.onModelChange = function() {
                    if ($scope.selectedModel) {
                        $scope.chatMessages = [];
                    }
                };

                // 发送消息给模型
                $scope.sendMessage = function() {
                    if (!$scope.userMessage || !$scope.selectedModel) return;

                    $scope.chatMessages.push({
                        role: 'user',
                        content: $scope.userMessage
                    });

                    var message = $scope.userMessage;
                    $scope.userMessage = '';

                    // 使用固定的 JSON 字符串模板
                    var prompt = message+', 数据严格参照下面的json格式：{"root":{"data":{"id":"d68jsqbo2y80","created":1733887432829,"text":"小程序推广"},"children":[{"data":{"id":"d68jsuf1i740","created":1733887441741,"text":"技术社区"},"children":[{"data":{"id":"d68jszaz4400","created":1733887452379,"text":"撰写技术博客"},"children":[]},{"data":{"id":"d68jttfqqs00","created":1733887517970,"text":"案例分享"},"children":[]},{"data":{"id":"d68jtxj0tdk0","created":1733887526876,"text":"开源贡献"},"children":[]}]},{"data":{"id":"d68ju0bjdx40","created":1733887532954,"text":"社交网络"},"children":[{"data":{"id":"d68ju78p8i80","created":1733887548019,"text":"小红书，抖音等。讲述产品故事"},"children":[]},{"data":{"id":"d68jubigmfs0","created":1733887557317,"text":"发起互动活动"},"children":[]}]},{"data":{"id":"d68jumx4d6w0","created":1733887582148,"text":"身边"},"children":[{"data":{"id":"d68jv7w3wuw0","created":1733887627799,"text":"分享朋友圈"},"children":[]},{"data":{"id":"d68jvddt15k0","created":1733887639753,"text":"分享微信群"},"children":[]}]},{"data":{"id":"d68jvp6lb140","created":1733887665438,"text":"SEO"},"children":[{"data":{"id":"d68jvr5yowo0","created":1733887669754,"text":"软件技术层面通过搜索引擎优化（SEO）"},"children":[]}]},{"data":{"id":"d68jw1ega2o0","created":1733887692035,"text":"产品用户裂变"},"children":[{"data":{"id":"d68jw8kb2680","created":1733887707626,"text":"分享奖励"},"children":[]},{"data":{"id":"d68jwb2var40","created":1733887713102,"text":"每日活动"},"children":[]},{"data":{"id":"d68jwfiauig0","created":1733887722743,"text":"产品社区频道"},"children":[]}]}]},"template":"right","theme":"fresh-blue","version":"1.4.43"}';

                    // 创建一个新的消息对象用于显示助手的回复
                    var assistantMessage = {
                        role: 'assistant',
                        content: ''
                    };
                    $scope.chatMessages.push(assistantMessage);

                    // 发送POST请求到服务器
                    fetch('http://localhost:3001/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: $scope.selectedModel,
                            prompt: prompt
                        })
                    })
                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error('网络响应不正常');
                        }
                        var reader = response.body.getReader();
                        var fullResponse = '';
                        
                        function processStream() {
                            return reader.read().then(function(result) {
                                var done = result.done;
                                var value = result.value;
                                
                                if (done) {
                                    return;
                                }
                                
                                // 将 Uint8Array 转换为文本
                                var chunk = new TextDecoder().decode(value);
                                var lines = chunk.split('\n');
                                
                                lines.forEach(function(line) {
                                    if (line.trim()) {
                                        try {
                                            var data = JSON.parse(line.replace(/^data: /, ''));
                                            console.log('55555data:', data);
                                            if (data.error) {
                                                $scope.$apply(function() {
                                                    assistantMessage.content = '发送消息失败：' + data.error;
                                                    assistantMessage.role = 'error';
                                                });
                                            } else if (data.response) {
                                                $scope.$apply(function() {
                                                    assistantMessage.content += data.response;
                                                    fullResponse += data.response;
                                                });
                                                // 使用 $timeout 确保视图更新并滚动到最新消息
                                                $timeout(function() {
                                                    var chatMessages = document.getElementById('chatMessages');
                                                    if (chatMessages) {
                                                        chatMessages.scrollTop = chatMessages.scrollHeight;
                                                    }
                                                }, 0);
                                            }
                                            if (data.done) {
                                                console.log('收到完整的响应:', fullResponse);
                                                // 改进JSON匹配逻辑
                                                var jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)```/) || fullResponse.match(/\{[\s\S]*?\}/g);
                                                if (jsonMatch) {
                                                    try {
                                                        var jsonStr = (jsonMatch[1] || jsonMatch[0]).trim();
                                                        var mindmapData = JSON.parse(jsonStr);
                                                        
                                                        if (mindmapData && (mindmapData.root || mindmapData.data)) {
                                                            $scope.$apply(function() {
                                                                $scope.markdownContent = JSON.stringify(mindmapData, null, 2);
                                                                $scope.convertToMindmap();
                                                            });
                                                        } else {
                                                            console.error('无效的思维导图数据结构');
                                                        }
                                                    } catch (e) {
                                                        console.error('解析JSON数据失败:', e);
                                                        console.error('JSON字符串:', jsonStr);
                                                    }
                                                }
                                            }
                                        } catch (e) {
                                            console.error('解析响应数据失败:', e);
                                        }
                                    }
                                });
                                
                                return processStream();
                            });
                        }
                        
                        return processStream();
                    })
                    .catch(function(error) {
                        console.error('请求失败:', error);
                        $scope.$apply(function() {
                            if (!assistantMessage.content) {
                                assistantMessage.content = '连接失败，请重试';
                                assistantMessage.role = 'error';
                            }
                        });
                    });
                };

                // 将 Markdown 文本转换为思维导图数据结构
                function parseMarkdown(text) {
                    // 尝试解析 JSON 格式
                    try {
                        var jsonData = JSON.parse(text);
                        if (jsonData.root) {
                            return jsonData.root;
                        }
                        return jsonData;
                    } catch (e) {
                        // 如果不是 JSON 格式，按照原来的 Markdown 格式处理
                        var lines = text.split('\n').filter(function(line) {
                            return line.trim();
                        });
                    
                        // 如果没有内容，返回默认的空白思维导图
                        if (lines.length === 0) {
                            return {
                                data: { text: '中心主题' },
                                children: []
                            };
                        }
                    
                        var root = null;
                        var currentLevel = 0;
                        var nodeStack = [];
                    
                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i];
                            var headingMatch = line.match(/^(#+)\s+(.+)/);
                    
                            if (headingMatch) {
                                var level = headingMatch[1].length;
                                var text = headingMatch[2].trim();
                    
                                // 创建节点
                                var node = {
                                    data: { text: text },
                                    children: []
                                };
                    
                                // 如果是第一个标题，将其设置为根节点
                                if (!root) {
                                    root = node;
                                    nodeStack = [root];
                                    continue;
                                }
                    
                                // 调整节点栈，确保正确的层级关系
                                while (nodeStack.length > level) {
                                    nodeStack.pop();
                                }
                    
                                // 如果需要填充中间层级，使用序号标记
                                while (nodeStack.length < level) {
                                    var lastNode = nodeStack[nodeStack.length - 1];
                                    var newNode = {
                                        data: { text: '分支主题 ' + (lastNode.children.length + 1) },
                                        children: []
                                    };
                                    lastNode.children.push(newNode);
                                    nodeStack.push(newNode);
                                }
                    
                                // 添加当前节点到父节点
                                var parent = nodeStack[nodeStack.length - 1];
                                parent.children.push(node);
                                nodeStack[level] = node;
                            } else {
                                // 处理普通文本行
                                var text = line.trim();
                                if (text) {
                                    // 如果还没有根节点，将第一行文本作为根节点
                                    if (!root) {
                                        root = {
                                            data: { text: text },
                                            children: []
                                        };
                                        nodeStack = [root];
                                    } else {
                                        // 将文本作为当前节点的子节点
                                        var node = {
                                            data: { text: text },
                                            children: []
                                        };
                                        var parent = nodeStack[nodeStack.length - 1];
                                        parent.children.push(node);
                                    }
                                }
                            }
                        }
                    
                        return root;
                    }
                }

                // 实时预览转换效果
                $scope.convertToMindmap = function() {
                    if (!$scope.markdownContent) return;
                    try {
                        var data = parseMarkdown($scope.markdownContent);
                        $scope.minder.importJson(data);
                    } catch (error) {
                        console.error('转换失败:', error);
                    }
                };

                // 导入思维导图
                $scope.importMarkdown = function() {
                    if (!$scope.markdownContent) return;
                    try {
                        var data = parseMarkdown($scope.markdownContent);
                        $scope.minder.importJson(data);
                    } catch (error) {
                        console.error('导入失败:', error);
                    }
                };

                // 清空内容
                $scope.clearMarkdown = function() {
                    $scope.markdownContent = '';
                    $scope.minder.importJson({
                        data: { text: '中心主题' },
                        children: []
                    });
                };
            }]
        };
    });