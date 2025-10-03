import argparse
import os

desc = "Install zsh config from NADEE-MJ/zsh"
distro_help = "The linux distribution to install zsh on, options: [debian12, ubuntu20.04, arch]"
HOME = os.path.expanduser("~")

parser = argparse.ArgumentParser(description=desc)
parser.add_argument("distro", type=str, help=distro_help)
args = parser.parse_args()

default_overrides = None
if args.distro == "debian13":
    update_packages = "sudo apt update && sudo apt upgrade -y"
    install_packages = (
        "sudo apt install git micro curl python3 python-is-python3 python3-pip zsh ripgrep net-tools tig fzf jq bc -y"
    )
    install_fun_packages = "sudo apt install cowsay figlet lolcat -y"
    install_extra_packages = "sudo apt install bat eza zoxide -y"
    default_overrides = (
        f"touch {HOME}/.config/zsh/overrides.zsh && printf 'alias bat=batcat\n' > {HOME}/.config/zsh/overrides.zsh"
    )
elif args.distro == "ubuntu20.04":
    update_packages = "sudo apt update && sudo apt upgrade -y"
    install_packages = (
        "sudo apt install git micro curl python3 python-is-python3 python3-pip zsh ripgrep net-tools tig fzf jq bc -y"
    )
    install_fun_packages = "sudo apt install cowsay figlet lolcat -y"
    exa_install = 'sudo apt install unzip -y && EXA_VERSION=$(curl -s "https://api.github.com/repos/ogham/exa/releases/latest" | grep -Po \'"tag_name": "v\K[0-9.]+\') && curl -Lo exa.zip "https://github.com/ogham/exa/releases/latest/download/exa-linux-x86_64-v${EXA_VERSION}.zip" && sudo unzip -q exa.zip bin/exa -d /usr/local && rm -rf exa.zip'
    zoxide_install = "curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash"
    install_extra_packages = f"sudo apt install bat -y && {exa_install} && {zoxide_install}"
    default_overrides = f"touch {HOME}/.config/zsh/overrides.zsh && printf 'alias bat=batcat\nexport PATH=$PATH:~/.local/bin\n' > {HOME}/.config/zsh/overrides.zsh"
elif args.distro == "ubuntu24.04":
    update_packages = "sudo apt update && sudo apt upgrade -y"
    install_packages = (
        "sudo apt install git micro curl python3 python-is-python3 python3-pip zsh ripgrep net-tools tig fzf jq bc-y"
    )
    install_fun_packages = "sudo apt install cowsay figlet lolcat -y"
    install_extra_packages = "sudo apt install bat eza zoxide -y"
    default_overrides = f"touch {HOME}/.config/zsh/overrides.zsh && printf 'alias bat=batcat\nexport PATH=$PATH:~/.local/bin\n' > {HOME}/.config/zsh/overrides.zsh"
elif args.distro == "arch":
    update_packages = "sudo pacman -Syyu --noconfirm"
    install_packages = "sudo pacman -S git curl micro python python-pip zsh ripgrep net-tools tig fzf jq bc --noconfirm"
    install_fun_packages = "sudo pacman -S cowsay figlet lolcat --noconfirm"
    install_extra_packages = "sudo pacman -S bat exa zoxide --noconfirm"
else:
    print("Not a valid distro option!\n")
    parser.print_help()
    exit(0)

# install necessary packages per distro
os.system(update_packages)
os.system(install_packages)
os.system(install_fun_packages)
os.system(install_extra_packages)

# add zsh to ~/.bashrc file
# you can remove this and change default shell for user to zsh however this has been more
# consistent in terms of usability. Otherwise you would have to copy all of the bashrc
# contents over to the zshrc. This is a lot simpler
with open(f"{HOME}/.bashrc", "r") as file:
    content = file.read()
    if "zsh" not in content:
        os.system(f'echo "zsh" >> {HOME}/.bashrc')

# install starship prompt
os.system("curl -sS https://starship.rs/install.sh | sh -s --yes")

# install nvm (Node Version Manager) and latest Node.js
print("Installing NVM and latest Node.js...")
nvm_install_command = "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash"
os.system(nvm_install_command)

# Source nvm and install latest Node.js
node_install_command = f'export NVM_DIR="{HOME}/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install node && nvm use node && nvm alias default node'
os.system(f"bash -c '{node_install_command}'")

# clone zsh repo to ~/.config/zsh
if os.path.exists(f"{HOME}/.config/zsh"):
    os.system(f"sudo rm -rf {HOME}/.config/zsh/")
os.system(f"mkdir -p {HOME}/.config/zsh/")
os.system(f"git clone --depth 1 https://github.com/NADEE-MJ/zsh.git {HOME}/.config/zsh")

# symlink zsh files to users home folder
if os.path.exists(f"{HOME}/.zshrc"):
    os.system(f"sudo rm -f {HOME}/.zshrc")
os.system(f"ln -s {HOME}/.config/zsh/.zshrc {HOME}/.zshrc")

# add default overrides
if default_overrides is not None:
    os.system(default_overrides)

# start zsh and start cloning plugins repos
os.system("exec zsh")
