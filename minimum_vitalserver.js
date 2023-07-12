const app = require('express')();
const server = require('http').createServer(app);
const io = require("socket.io")(server);
const zlib = require('zlib');

app.get('/', (req, res) => {
    res.send(`<script src="/socket.io/socket.io.js"></script>
            <div id=display></div>
            <script>
            io().on('send_data', (data) => {
                var rooms = data['rooms'];
                var trks = rooms[0]['trks'];
                var str = '';
                for (var i in trks) {
                    str += trks[i].name + '=';
                    if (trks[i].recs.length > 0)
                        str += trks[i].recs[0].val;
                    str += '<br>';
                }
                document.getElementById('display').innerHTML = str;
                //console.log(trks);
            });
        </script>`);
});

io.on('connection', (socket) => {
    console.log(`connect ${socket.id}`);
    socket.on("disconnect", (reason) => {
      console.log(`disconned ${socket.id} due to ${reason}`);
    });
    socket.on("send_data", data => {
        console.log("data received");
        try{
            var z1 = zlib.inflateSync(Buffer.from(data, 'binary')).toString();
            z1.replace('/[\x00-\x1F\x7F]/u', '');
            z1.replace('nan', '""');
            var json = JSON.parse(z1);
            socket.broadcast.emit('send_data', json);
        } catch(err){
            console.log("send_data ERROR", err, data);
        }
    });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});