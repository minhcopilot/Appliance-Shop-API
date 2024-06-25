echo "Pulling from git..."
git pull
echo "Rebuilding..."
/www/server/nodejs/v18.20.0/bin/yarn build
echo "Restarting project"
pid=`ps aux|grep $(cat /www/server/nodejs/vhost/pids/xxx.pid)|grep -v grep|wc -l`
echo ${pid}
echo 
if [ "${pid}" == "0" ];then
# bash /www/server/nodejs/vhost/scripts/xxx.sh
echo "${pid} restarted"
else echo "Server not started, started"
fi 
