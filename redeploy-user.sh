cd ../Appliance-Shop-Users
git remote update
UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")
BASE=$(git merge-base @ "$UPSTREAM")

if [ $LOCAL = $REMOTE ]; then
    echo "User: Up-to-date"
elif [ $LOCAL = $BASE ]; then
    echo "User: Pulling from git..."
    git pull
    echo "User: Rebuilding..."
    /www/server/nodejs/v18.20.0/bin/yarn build
    echo "User: Restarting project"
    pkill -9 $(cat /www/server/nodejs/vhost/pids/appliance_shop_user.pid)
    pid=`ps aux|grep $(cat /www/server/nodejs/vhost/pids/appliance_shop_user.pid)|grep -v grep|wc -l`
    if [ "${pid}" == "0" ];then
        bash /www/server/nodejs/vhost/scripts/appliance_shop_user.sh
        else echo "User: Project restarted"

    fi 
elif [ $REMOTE = $BASE ]; then
    echo "User: Code on server has been edited, please check again"
else
    echo "User: Diverged"
fi

