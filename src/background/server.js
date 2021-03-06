import SerialPool from './serial';
import HIDPool from './hid';
import {Server} from 'connect.io';

const server = new Server();

// 监听 HID 设备
const hidPool = window.__hid = new HIDPool();

hidPool.on( 'data' , ( data , hidDevice )=> {
  server.send( 'data' , {
    data ,
    device : hidDevice
  } );
} );

hidPool.on( 'data change' , ( newData , oldData , hidDevice )=> {
  server.send( 'data change' , {
    newData ,
    oldData ,
    device : hidDevice
  } );
} );

hidPool.on( 'hid added' , ( hidDevice )=> {
  server.send( 'device added' , {
    device : hidDevice
  } );
} );

hidPool.on( 'hid removed' , hidDevice => {
  server.send( 'device removed' , {
    device : hidDevice
  } );
} );

// 监听串口设备
const serialPool = window.__serial = new SerialPool();

// data 事件太频繁，就不发送了
//serialPool.on( 'data' , ( data , serialDevice )=> {
//  server.send( 'data' , {
//    newData , oldData ,
//    device : serialDevice
//  } );
//} );

serialPool.on( 'data change' , ( newData , oldData , serialDevice )=> {
  server.send( 'data change' , {
    newData ,
    oldData ,
    device : serialDevice
  } );
} );

serialPool.on( 'error' , serialDevice => {
  server.send( 'device error' , serialDevice );
} );

// 通用事件
server.on( 'connect' , client => {
  console.log( '收到客户端连接：' , client );

  sendAllDevices();

  client.on( 'reconnect' , ( data , resolve , reject )=> {
    console.log( '收到客户端的重新连接请求：' , data );

    Promise
      .all( [
        serialPool.connectAll() ,
        hidPool.connectAll()
      ] )
      .then( ()=> {
        sendAllDevices();
        resolve();
      } , e => {
        reject( e );
      } );
  } );

  function sendAllDevices() {
    client.send( 'all devices' , serialPool.devices.concat( hidPool.devices ) );
  }
} );
