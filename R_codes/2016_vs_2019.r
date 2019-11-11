data <- scan("2016_vs_2019.txt")
e_2016 <- data[1:12]
e_2019 <- data[13:24]
lr <- lm(e_2019~e_2016)
summary(lr)
