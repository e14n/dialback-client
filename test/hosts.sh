#!/bin/sh

grep "echo.localhost" /etc/hosts || echo "127.0.69.4 echo.localhost echo" | sudo tee -a /etc/hosts
grep "dialbackclient.localhost" /etc/hosts || echo "127.0.69.8 dialbackclient.localhost dialbackclient" | sudo tee -a /etc/hosts


